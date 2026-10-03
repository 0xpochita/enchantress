import type { TransactionReceipt } from "viem";
import type { ExecutionStepRow } from "@/lib/db/schema";
import { UNISWAP_MONAD } from "../../chain/abis/uniswap.ts";
import {
  type ChainToken,
  MONAD_TOKENS,
  type MonadTokenSymbol,
} from "../../chain/config/tokens.ts";
import { toAmount } from "../../portfolio/utils/lots.ts";
import type { UnitsChange, VaultAdapter } from "../../vaults/types.ts";
import {
  approveCalldata,
  minimumOut,
  uniswapSwapCalldata,
} from "../utils/calldata.ts";
import { ExecutionStepError, RetryableStepError } from "../utils/failures.ts";
import type { StepKind } from "../utils/plan.ts";
import { receivedAmount } from "../utils/receipts.ts";
import type { LoadedExecution } from "./execution-repository.ts";
import type { RunnerPorts, Transaction, Wallet } from "./runner-ports.ts";

export interface StepContext {
  ports: RunnerPorts;
  loaded: LoadedExecution;
  step: ExecutionStepRow;
  wallet: Wallet;
}

export interface StepEntry {
  build(ctx: StepContext, amount: bigint): Promise<Transaction>;
  unitsBefore(ctx: StepContext): Promise<bigint | null>;
  settle(ctx: StepContext, receipt: TransactionReceipt): Promise<bigint | null>;
}

function token(symbol: string): ChainToken {
  return MONAD_TOKENS[symbol as MonadTokenSymbol];
}

function adapterOf({ ports, step }: StepContext): VaultAdapter {
  const adapter = ports.chain.adapter(step.venueId);
  if (!adapter)
    throw new ExecutionStepError(
      "UNKNOWN_VENUE",
      `Unknown venue ${step.venueId}`,
    );
  return adapter;
}

export function resolveAmount(
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

function unitsChange(
  { step, wallet }: StepContext,
  receipt: TransactionReceipt,
): UnitsChange {
  return {
    assetSymbol: step.assetSymbol,
    owner: wallet.address,
    receipt,
    unitsBefore: step.unitsBefore === null ? null : BigInt(step.unitsBefore),
    amount: BigInt(step.amountBase ?? "0"),
  };
}

async function ledgerValueUsd(
  { ports, step }: StepContext,
  amountBase: bigint,
): Promise<number> {
  const value = await ports.prices.valueUsd(step.assetSymbol, amountBase);
  if (!value.priced)
    throw new RetryableStepError(`No price for ${step.assetSymbol}`);
  return value.valueUsd;
}

function alreadyRecorded({ ports, loaded }: StepContext, hash: string) {
  return ports.store.hasLedgerEntry(loaded.execution.id, hash);
}

async function priceOf(ctx: StepContext, symbol: string): Promise<number> {
  const price = await ctx.ports.prices.priceUsd(symbol);
  if (price === undefined)
    throw new ExecutionStepError("NO_PRICE", `No price for ${symbol}`);
  return price;
}

async function expectedSwapOutput(
  ctx: StepContext,
  from: ChainToken,
  to: ChainToken,
  amountIn: bigint,
): Promise<bigint> {
  const [priceIn, priceOut] = await Promise.all([
    priceOf(ctx, from.symbol),
    priceOf(ctx, to.symbol),
  ]);
  const usd = toAmount(amountIn, from.decimals) * priceIn;
  return BigInt(Math.floor((usd / priceOut) * 10 ** to.decimals));
}

async function buildSwap(ctx: StepContext, amountIn: bigint) {
  const tokenIn = token(ctx.loaded.execution.depositAsset);
  const tokenOut = token(ctx.step.assetSymbol);
  const quote = await ctx.ports.swaps.quote({
    tokenIn: tokenIn.address,
    tokenOut: tokenOut.address,
    amountIn,
    expectedOut: await expectedSwapOutput(ctx, tokenIn, tokenOut, amountIn),
    pairLabel: tokenOut.symbol,
  });
  const data = uniswapSwapCalldata({
    tokenIn: tokenIn.address,
    tokenOut: tokenOut.address,
    fee: quote.fee,
    recipient: ctx.wallet.address,
    amountIn,
    amountOutMinimum: minimumOut(
      quote.amountOut,
      ctx.ports.swaps.slippageBps(),
    ),
  });
  return { to: UNISWAP_MONAD.swapRouter02, data };
}

function received(ctx: StepContext, receipt: TransactionReceipt): bigint {
  return receivedAmount(
    receipt.logs,
    token(ctx.step.assetSymbol).address,
    ctx.wallet.address,
  );
}

const noUnits = async () => null;

const approve: StepEntry = {
  build: async (ctx, amount) => {
    const spender =
      ctx.step.spender === "router"
        ? UNISWAP_MONAD.swapRouter02
        : adapterOf(ctx).callTarget(ctx.step.assetSymbol);
    return {
      to: token(ctx.step.assetSymbol).address,
      data: approveCalldata(spender, amount),
    };
  },
  unitsBefore: noUnits,
  settle: async () => null,
};

const swap: StepEntry = {
  build: buildSwap,
  unitsBefore: noUnits,
  settle: async (ctx, receipt) => received(ctx, receipt),
};

const supply: StepEntry = {
  build: async (ctx, amount) =>
    adapterOf(ctx).supplyTransaction(
      ctx.step.assetSymbol,
      amount,
      ctx.wallet.address,
    ),
  unitsBefore: (ctx) =>
    adapterOf(ctx).unitsBefore(ctx.wallet.address, ctx.step.assetSymbol),
  settle: async (ctx, receipt) => {
    if (await alreadyRecorded(ctx, receipt.transactionHash)) return null;
    const amountBase = resolveAmount(ctx.step, ctx.loaded.steps);
    await ctx.ports.store.recordDeposit({
      execution: ctx.loaded.execution,
      step: ctx.step,
      units: await adapterOf(ctx).suppliedUnits(unitsChange(ctx, receipt)),
      amountBase,
      valueUsd: await ledgerValueUsd(ctx, amountBase),
      txHash: receipt.transactionHash,
    });
    return null;
  },
};

const exit: StepEntry = {
  build: async (ctx, amount) =>
    adapterOf(ctx).exitTransaction(
      ctx.step.assetSymbol,
      amount,
      ctx.wallet.address,
    ),
  unitsBefore: supply.unitsBefore,
  settle: async (ctx, receipt) => {
    const amountBase = received(ctx, receipt);
    if (await alreadyRecorded(ctx, receipt.transactionHash)) return amountBase;
    await ctx.ports.store.recordWithdraw({
      execution: ctx.loaded.execution,
      step: ctx.step,
      burnedUnits: await adapterOf(ctx).burnedUnits(unitsChange(ctx, receipt)),
      amountBase,
      valueUsd: await ledgerValueUsd(ctx, amountBase),
      txHash: receipt.transactionHash,
    });
    return amountBase;
  },
};

const STEP_ENTRIES: Record<StepKind, StepEntry> = {
  approve,
  swap,
  supply,
  withdraw: exit,
  redeem: exit,
};

function isStepKind(kind: string): kind is StepKind {
  return Object.hasOwn(STEP_ENTRIES, kind);
}

export function stepEntry(step: ExecutionStepRow): StepEntry {
  if (!isStepKind(step.kind))
    throw new ExecutionStepError("UNKNOWN_STEP", `Unknown step ${step.kind}`);
  return STEP_ENTRIES[step.kind];
}
