import "server-only";
import { type Address, parseUnits } from "viem";
import { serverEnv } from "@/config/env.server";
import { MONAD_TOKENS } from "@/features/chain/config/tokens";
import { readTokenBalance } from "@/features/chain/services/balances";
import type { UserRow } from "@/lib/db/schema";
import { getIndexSummary } from "@/lib/market";
import type { CreateExecutionBody, ExecutionView } from "../types";
import { checkBetaGate } from "../utils/beta-gate";
import { type PlanSlice, planDeposit } from "../utils/plan";
import {
  activeExecutionId,
  createExecution,
  loadExecution,
  spentTodayUsd,
  toExecutionView,
} from "./execution-repository";
import { bestSwapQuote } from "./uniswap-quote";

const BPS = 10_000;

export class DepositRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DepositRequestError";
  }
}

function requireDelegatedWallet(user: UserRow): {
  id: string;
  address: Address;
} {
  if (!user.walletId || !user.walletAddress)
    throw new DepositRequestError(
      409,
      "NO_WALLET",
      "Your wallet is still being created.",
    );
  if (!user.delegatedAt)
    throw new DepositRequestError(
      409,
      "NOT_DELEGATED",
      "Allow Enchantress to manage your vault deposits first.",
    );
  return { id: user.walletId, address: user.walletAddress as Address };
}

async function assertSwappable(
  depositAsset: string,
  slices: PlanSlice[],
  amountBase: bigint,
) {
  const from = MONAD_TOKENS[depositAsset as keyof typeof MONAD_TOKENS];
  for (const slice of slices.filter((s) => s.assetSymbol !== depositAsset)) {
    const to = MONAD_TOKENS[slice.assetSymbol as keyof typeof MONAD_TOKENS];
    const probe = (amountBase * BigInt(slice.weightBps)) / BigInt(BPS);
    await bestSwapQuote({
      tokenIn: from.address,
      tokenOut: to.address,
      amountIn: probe,
      expectedOut: 0n,
      pairLabel: to.symbol,
    }).catch((error: Error) => {
      throw new DepositRequestError(422, "NO_LIQUIDITY", error.message);
    });
  }
}

async function assertBetaGate(user: UserRow, valueUsd: number) {
  const env = serverEnv();
  const gate = checkBetaGate({
    email: user.email,
    allowlist: env.BETA_ALLOWLIST_EMAILS,
    spentTodayUsd: await spentTodayUsd(user.id),
    valueUsd,
    maxPerDayUsd: env.BETA_MAX_DEPOSIT_USD_PER_DAY,
  });
  if (!gate.ok) throw new DepositRequestError(403, "BETA_LIMIT", gate.reason);
}

export async function createDeposit(
  user: UserRow,
  body: CreateExecutionBody,
): Promise<ExecutionView> {
  const wallet = requireDelegatedWallet(user);
  const summary = await getIndexSummary(body.indexId);
  if (!summary)
    throw new DepositRequestError(
      404,
      "NOT_FOUND",
      "This index does not exist.",
    );
  if (await activeExecutionId(user.id))
    throw new DepositRequestError(
      409,
      "BUSY",
      "Another deposit is still running. Wait for it to finish.",
    );
  const token = MONAD_TOKENS[body.depositAsset];
  const amountBase = parseUnits(body.amount, token.decimals);
  if (amountBase <= 0n)
    throw new DepositRequestError(400, "AMOUNT", "Enter an amount above zero.");
  const balance = await readTokenBalance(wallet.address, token);
  if (balance < amountBase)
    throw new DepositRequestError(
      400,
      "BALANCE",
      `You only have ${Number(balance) / 10 ** token.decimals} ${token.symbol} on Monad.`,
    );
  const price =
    summary.allocations.find((a) => a.asset.symbol === body.depositAsset)?.asset
      .priceUsd ?? 1;
  const valueUsd = Number(body.amount) * price;
  await assertBetaGate(user, valueUsd);
  const slices = summary.allocations.map((a) => ({
    assetSymbol: a.asset.symbol,
    weightBps: Math.round(a.weight * BPS),
    venueId: a.venue.id,
  }));
  await assertSwappable(body.depositAsset, slices, amountBase);
  const steps = planDeposit({
    depositAsset: body.depositAsset,
    depositAmountBase: amountBase,
    slices,
  });
  const execution = await createExecution({
    userId: user.id,
    indexId: summary.index.id,
    depositAsset: body.depositAsset,
    depositAmountBase: amountBase,
    valueUsd,
    steps,
  });
  const loaded = await loadExecution(execution.id);
  if (!loaded)
    throw new DepositRequestError(
      500,
      "CREATE",
      "Could not start the deposit.",
    );
  return toExecutionView(loaded);
}
