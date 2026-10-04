import "server-only";
import { MONAD_TOKENS } from "@/features/chain/config/tokens";
import { routeIndexForDeposit } from "@/features/indexes/services/index-catalog";
import type { IndexSummary } from "@/features/indexes/utils/route-index";
import { ExecutionRequestError } from "../types";
import { type PlannedStep, type PlanSlice, planDeposit } from "../utils/plan";
import {
  bestSwapQuote,
  NoLiquidityError,
  QuoteUnavailableError,
} from "./uniswap-quote";

const BPS = 10_000;

export interface DepositPlan {
  summary: IndexSummary;
  slices: PlanSlice[];
  steps: PlannedStep[];
}

const HUB_TOKENS = ["USDC", "USDT0", "WMON"];

type TokenSymbol = keyof typeof MONAD_TOKENS;

async function quoteOut(
  from: string,
  to: string,
  amountIn: bigint,
): Promise<bigint> {
  if (amountIn <= 0n) return 0n;
  const quote = await bestSwapQuote({
    tokenIn: MONAD_TOKENS[from as TokenSymbol].address,
    tokenOut: MONAD_TOKENS[to as TokenSymbol].address,
    amountIn,
    expectedOut: 0n,
    pairLabel: to,
  }).catch((error: unknown) => {
    if (error instanceof NoLiquidityError) return null;
    if (error instanceof QuoteUnavailableError)
      throw new ExecutionRequestError(503, "QUOTE_UNAVAILABLE", error.message);
    throw error;
  });
  return quote?.amountOut ?? 0n;
}

async function hubOut(
  from: string,
  hub: string,
  to: string,
  amountIn: bigint,
): Promise<bigint> {
  return quoteOut(hub, to, await quoteOut(from, hub, amountIn));
}

async function routeSlice(
  depositAsset: string,
  slice: PlanSlice,
  amountIn: bigint,
): Promise<PlanSlice> {
  if (slice.assetSymbol === depositAsset) return slice;
  const hubs = HUB_TOKENS.filter(
    (hub) => hub !== depositAsset && hub !== slice.assetSymbol,
  );
  const outputs = await Promise.all([
    quoteOut(depositAsset, slice.assetSymbol, amountIn),
    ...hubs.map((hub) =>
      hubOut(depositAsset, hub, slice.assetSymbol, amountIn),
    ),
  ]);
  const best = outputs.indexOf(outputs.reduce((a, b) => (b > a ? b : a)));
  if (outputs[best] === 0n)
    throw new ExecutionRequestError(
      422,
      "NO_LIQUIDITY",
      `Not enough liquidity to swap into ${slice.assetSymbol} right now.`,
    );
  return best === 0 ? slice : { ...slice, via: hubs[best - 1] };
}

export async function routeSwaps(
  depositAsset: string,
  slices: PlanSlice[],
  amountBase: bigint,
): Promise<PlanSlice[]> {
  const routed: PlanSlice[] = [];
  for (const slice of slices)
    routed.push(
      await routeSlice(
        depositAsset,
        slice,
        (amountBase * BigInt(slice.weightBps)) / BigInt(BPS),
      ),
    );
  return routed;
}

export async function buildDepositPlan(
  indexId: string,
  depositAsset: string,
  amountBase: bigint,
): Promise<DepositPlan> {
  const routed = await routeIndexForDeposit(indexId);
  if (!routed)
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
  const { summary, routing } = routed;
  if (!routing.ok)
    throw new ExecutionRequestError(
      422,
      "UNROUTABLE",
      `${routing.unroutableAsset} has no eligible vault right now, so this index cannot take deposits.`,
    );
  const { slices } = routing;
  const swapSlices = await routeSwaps(depositAsset, slices, amountBase);
  const steps = planDeposit({
    depositAsset,
    depositAmountBase: amountBase,
    slices: swapSlices,
  });
  return { summary, slices: swapSlices, steps };
}
