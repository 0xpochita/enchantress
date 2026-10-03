import "server-only";
import { MONAD_TOKENS } from "@/features/chain/config/tokens";
import { getIndexSummary, type IndexSummary } from "@/lib/market";
import { ExecutionRequestError } from "../types";
import { type PlannedStep, type PlanSlice, planDeposit } from "../utils/plan";
import { bestSwapQuote } from "./uniswap-quote";

const BPS = 10_000;

export interface DepositPlan {
  summary: IndexSummary;
  slices: PlanSlice[];
  steps: PlannedStep[];
}

export async function assertSwappable(
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
      throw new ExecutionRequestError(422, "NO_LIQUIDITY", error.message);
    });
  }
}

export async function buildDepositPlan(
  indexId: string,
  depositAsset: string,
  amountBase: bigint,
): Promise<DepositPlan> {
  const summary = await getIndexSummary(indexId);
  if (!summary)
    throw new ExecutionRequestError(
      404,
      "NOT_FOUND",
      "This index does not exist.",
    );
  if (amountBase <= 0n)
    throw new ExecutionRequestError(
      400,
      "AMOUNT",
      "Enter an amount above zero.",
    );
  const slices = summary.allocations.map((a) => ({
    assetSymbol: a.asset.symbol,
    weightBps: Math.round(a.weight * BPS),
    venueId: a.venue.id,
  }));
  await assertSwappable(depositAsset, slices, amountBase);
  const steps = planDeposit({
    depositAsset,
    depositAmountBase: amountBase,
    slices,
  });
  return { summary, slices, steps };
}
