import "server-only";
import type { Address, Hex, TransactionReceipt } from "viem";
import { serverEnv } from "@/config/env.server";
import { advanceBridging } from "@/features/bridge/services/bridge-lifecycle";
import { UNISWAP_MONAD } from "@/features/chain/abis/uniswap";
import {
  type ChainToken,
  MONAD_TOKENS,
  type MonadTokenSymbol,
} from "@/features/chain/config/tokens";
import { monadClient } from "@/features/chain/services/public-client";
import {
  createAdapter,
  getVenueSnapshot,
} from "@/features/vaults/services/venue-snapshot";
import type { UnitsChange, VaultAdapter } from "@/features/vaults/types";
import { findUserById } from "@/features/wallet/server";
import type { ExecutionRow, ExecutionStepRow } from "@/lib/db/schema";
import { ExecutionRequestError } from "../types";
import {
  approveCalldata,
  minimumOut,
  uniswapSwapCalldata,
} from "../utils/calldata";
import { receivedAmount } from "../utils/receipts";
import {
  acquireLease,
  finishExecution,
  type LoadedExecution,
  loadExecution,
  recordDeposit,
  recordWithdraw,
  releaseLease,
  updateStep,
} from "./execution-repository";
import { readTransactionState, sendMonadTransaction } from "./privy-sender";
import { bestSwapQuote, NoLiquidityError } from "./uniswap-quote";

const SETTLED_FAILURES = new Set([
  "execution_reverted",
  "failed",
  "replaced",
  "provider_error",
]);

export class ExecutionStepError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ExecutionStepError";
  }
}

interface Wallet {
  id: string;
  address: Address;
}

interface Transaction {
  to: Address;
  data: Hex;
}

function token(symbol: string): ChainToken {
  return MONAD_TOKENS[symbol as MonadTokenSymbol];
}

function adapterOf(venueId: string): VaultAdapter {
  const adapter = createAdapter(venueId);
  if (!adapter)
    throw new ExecutionStepError("UNKNOWN_VENUE", `Unknown venue ${venueId}`);
  return adapter;
}

function resolveAmount(
  step: ExecutionStepRow,
  steps: ExecutionStepRow[],
): bigint {
  if (step.amountBase !== null) return BigInt(step.amountBase);
  const source = steps.find((s) => s.position === step.amountFromPosition);
  if (!source?.amountOutBase)
    throw new ExecutionStepError(
      "MISSING_AMOUNT",
      "Swap output is not known yet.",
    );
  return BigInt(source.amountOutBase);
}

async function priceUsd(symbol: string): Promise<number> {
  const asset = (await getVenueSnapshot()).assets.find(
    (a) => a.symbol === symbol,
  );
  if (!asset)
    throw new ExecutionStepError("NO_PRICE", `No price for ${symbol}`);
  return asset.priceUsd;
}

async function expectedSwapOutput(
  from: ChainToken,
  to: ChainToken,
  amountIn: bigint,
) {
  const [priceIn, priceOut] = await Promise.all([
    priceUsd(from.symbol),
    priceUsd(to.symbol),
  ]);
  const usd = (Number(amountIn) / 10 ** from.decimals) * priceIn;
  return BigInt(Math.floor((usd / priceOut) * 10 ** to.decimals));
}

async function swapTransaction(
  execution: ExecutionRow,
  step: ExecutionStepRow,
  amountIn: bigint,
  wallet: Wallet,
): Promise<Transaction> {
  const tokenIn = token(execution.depositAsset);
  const tokenOut = token(step.assetSymbol);
  const quote = await bestSwapQuote({
    tokenIn: tokenIn.address,
    tokenOut: tokenOut.address,
    amountIn,
    expectedOut: await expectedSwapOutput(tokenIn, tokenOut, amountIn),
    pairLabel: tokenOut.symbol,
  });
  const data = uniswapSwapCalldata({
    tokenIn: tokenIn.address,
    tokenOut: tokenOut.address,
    fee: quote.fee,
    recipient: wallet.address,
    amountIn,
    amountOutMinimum: minimumOut(
      quote.amountOut,
      serverEnv().SWAP_SLIPPAGE_BPS,
    ),
  });
  return { to: UNISWAP_MONAD.swapRouter02, data };
}

function approveTransaction(
  step: ExecutionStepRow,
  amount: bigint,
): Transaction {
  const spender =
    step.spender === "router"
      ? UNISWAP_MONAD.swapRouter02
      : adapterOf(step.venueId).callTarget(step.assetSymbol);
  return {
    to: token(step.assetSymbol).address,
    data: approveCalldata(spender, amount),
  };
}

function isExit(step: ExecutionStepRow): boolean {
  return step.kind === "withdraw" || step.kind === "redeem";
}

async function buildTransaction(
  loaded: LoadedExecution,
  step: ExecutionStepRow,
  wallet: Wallet,
): Promise<Transaction> {
  const amount = resolveAmount(step, loaded.steps);
  if (step.kind === "swap")
    return swapTransaction(loaded.execution, step, amount, wallet);
  if (step.kind === "approve") return approveTransaction(step, amount);
  const adapter = adapterOf(step.venueId);
  if (isExit(step))
    return adapter.exitTransaction(step.assetSymbol, amount, wallet.address);
  return adapter.supplyTransaction(step.assetSymbol, amount, wallet.address);
}

async function sendStep(
  loaded: LoadedExecution,
  step: ExecutionStepRow,
  wallet: Wallet,
) {
  const transaction = await buildTransaction(loaded, step, wallet);
  const unitsBefore =
    step.kind === "supply" || isExit(step)
      ? await adapterOf(step.venueId).unitsBefore(
          wallet.address,
          step.assetSymbol,
        )
      : null;
  const attempts = step.attempts + 1;
  const sent = await sendMonadTransaction({
    walletId: wallet.id,
    ...transaction,
    idempotencyKey: `${loaded.execution.id}:${step.position}:${attempts}`,
  });
  await updateStep(step.id, {
    status: "sent",
    attempts,
    unitsBefore: unitsBefore?.toString() ?? null,
    privyTransactionId: sent.transactionId,
    txHash: sent.hash,
    lastError: null,
  });
}

interface StepOutputs {
  amountOut: bigint | null;
  units: bigint | null;
}

async function successfulReceipt(hash: Hex): Promise<TransactionReceipt> {
  const receipt = await monadClient().getTransactionReceipt({ hash });
  if (receipt.status !== "success")
    throw new ExecutionStepError(
      "REVERTED",
      "The transaction reverted on Monad.",
    );
  return receipt;
}

function unitsChange(
  step: ExecutionStepRow,
  receipt: TransactionReceipt,
  wallet: Wallet,
): UnitsChange {
  return {
    assetSymbol: step.assetSymbol,
    owner: wallet.address,
    receipt,
    unitsBefore: step.unitsBefore === null ? null : BigInt(step.unitsBefore),
    amount: BigInt(step.amountBase ?? "0"),
  };
}

async function confirmedOutputs(
  step: ExecutionStepRow,
  hash: Hex,
  wallet: Wallet,
): Promise<StepOutputs> {
  const receipt = await successfulReceipt(hash);
  const received = () =>
    receivedAmount(
      receipt.logs,
      token(step.assetSymbol).address,
      wallet.address,
    );
  if (step.kind === "swap") return { amountOut: received(), units: null };
  const change = () => unitsChange(step, receipt, wallet);
  if (step.kind === "supply")
    return {
      amountOut: null,
      units: await adapterOf(step.venueId).suppliedUnits(change()),
    };
  if (isExit(step))
    return {
      amountOut: received(),
      units: await adapterOf(step.venueId).burnedUnits(change()),
    };
  return { amountOut: null, units: null };
}

async function settleSupply(
  loaded: LoadedExecution,
  step: ExecutionStepRow,
  units: bigint,
  hash: string,
) {
  const amountBase = resolveAmount(step, loaded.steps);
  const asset = token(step.assetSymbol);
  const valueUsd =
    (Number(amountBase) / 10 ** asset.decimals) *
    (await priceUsd(asset.symbol));
  await recordDeposit({
    execution: loaded.execution,
    step,
    units,
    amountBase,
    valueUsd,
    txHash: hash,
  });
}

async function settleWithdraw(
  loaded: LoadedExecution,
  step: ExecutionStepRow,
  outputs: StepOutputs,
  hash: string,
) {
  const amountBase = outputs.amountOut ?? 0n;
  const asset = token(step.assetSymbol);
  const valueUsd =
    (Number(amountBase) / 10 ** asset.decimals) *
    (await priceUsd(asset.symbol));
  await recordWithdraw({
    execution: loaded.execution,
    step,
    burnedUnits: outputs.units ?? 0n,
    amountBase,
    valueUsd,
    txHash: hash,
  });
}

async function settleOutputs(
  loaded: LoadedExecution,
  step: ExecutionStepRow,
  outputs: StepOutputs,
  hash: string,
) {
  if (isExit(step)) return settleWithdraw(loaded, step, outputs, hash);
  if (outputs.units !== null)
    await settleSupply(loaded, step, outputs.units, hash);
}

async function settleStep(
  loaded: LoadedExecution,
  step: ExecutionStepRow,
  wallet: Wallet,
) {
  if (!step.privyTransactionId)
    throw new ExecutionStepError(
      "NO_TRANSACTION",
      "The transaction was never sent.",
    );
  const state = await readTransactionState(step.privyTransactionId);
  if (SETTLED_FAILURES.has(state.status))
    throw new ExecutionStepError(
      "TRANSACTION_FAILED",
      `The transaction ${state.status.replace("_", " ")}.`,
    );
  if (state.status !== "confirmed" || !state.hash) return;
  const hash = state.hash as Hex;
  const outputs = await confirmedOutputs(step, hash, wallet);
  await settleOutputs(loaded, step, outputs, hash);
  await updateStep(step.id, {
    status: "confirmed",
    txHash: hash,
    amountOutBase: outputs.amountOut?.toString() ?? null,
  });
  const isLast = loaded.steps.every(
    (s) => s.position <= step.position || s.status === "confirmed",
  );
  if (isLast) await finishExecution(loaded.execution.id, "succeeded");
}

function failureOf(error: unknown): { code: string; message: string } {
  if (
    error instanceof ExecutionStepError ||
    error instanceof NoLiquidityError ||
    error instanceof ExecutionRequestError
  )
    return { code: error.name, message: error.message };
  return {
    code: "UNEXPECTED",
    message:
      "Something went wrong while executing. Your funds stay in your wallet.",
  };
}

async function walletOf(execution: ExecutionRow): Promise<Wallet> {
  const user = await findUserById(execution.userId);
  if (!user?.walletId || !user.walletAddress)
    throw new ExecutionStepError(
      "NO_WALLET",
      "This account has no embedded wallet.",
    );
  return { id: user.walletId, address: user.walletAddress as Address };
}

async function runStep(loaded: LoadedExecution, step: ExecutionStepRow) {
  const wallet = await walletOf(loaded.execution);
  if (step.status === "pending") await sendStep(loaded, step, wallet);
  else if (step.status === "sent") await settleStep(loaded, step, wallet);
}

export async function advanceExecution(id: string): Promise<void> {
  if (!(await acquireLease(id))) return;
  const loaded = await loadExecution(id);
  const step = loaded?.steps.find((s) => s.status !== "confirmed");
  try {
    if (!loaded) return;
    if (loaded.execution.status === "bridging") return advanceBridging(loaded);
    if (loaded.execution.status !== "executing") return;
    if (!step) return finishExecution(id, "succeeded");
    await runStep(loaded, step);
  } catch (error) {
    const failure = failureOf(error);
    if (step)
      await updateStep(step.id, {
        status: "failed",
        lastError: failure.message,
      });
    await finishExecution(id, "failed", failure);
  } finally {
    await releaseLease(id);
  }
}
