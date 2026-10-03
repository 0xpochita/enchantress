import "server-only";
import type { Address } from "viem";
import { quoteAtRates } from "@/features/portfolio/services/valuation";
import {
  marketKey,
  valueHoldings,
  valueUnits,
} from "@/features/portfolio/utils/lots";
import { VENUE_CONFIGS } from "@/features/vaults/config/venues";
import type { UserRow } from "@/lib/db/schema";
import {
  type CreateWithdrawBody,
  ExecutionRequestError,
  type IndexPosition,
} from "../types";
import { baseToAmount } from "../utils/activity";
import {
  planWithdrawLegs,
  type WithdrawLeg,
  withdrawSteps,
} from "../utils/withdraw";
import type { NewExecution } from "./execution-repository";
import { type HoldingRead, readIndexHoldings } from "./withdraw-holdings";

function venueName(venueId: string): string {
  return VENUE_CONFIGS.find((v) => v.id === venueId)?.name ?? venueId;
}

type HoldingLeg = WithdrawLeg<HoldingRead>;

function assertLiquidity(legs: HoldingLeg[]): void {
  for (const leg of legs) {
    const { holding } = leg;
    if (leg.units <= holding.maxUnits) continue;
    const available = baseToAmount(
      holding.assetSymbol,
      holding.availableAssets,
    );
    throw new ExecutionRequestError(
      409,
      "LOW_LIQUIDITY",
      `Only ${available.toFixed(2)} ${holding.assetSymbol} is available on ${venueName(holding.venueId)} right now. Try a smaller amount later.`,
    );
  }
}

async function legsValueUsd(legs: HoldingLeg[]): Promise<number> {
  const quotes = await quoteAtRates(legs.map((leg) => leg.holding));
  return legs.reduce((sum, { holding, units }) => {
    const quote = quotes.get(marketKey(holding.venueId, holding.assetSymbol));
    return sum + valueUnits(units, quote).valueUsd;
  }, 0);
}

export async function previewIndexPosition(
  user: UserRow,
  indexId: string,
): Promise<IndexPosition> {
  if (!user.walletAddress) return { valueUsd: 0, holdings: [] };
  const reads = await readIndexHoldings(
    user.id,
    user.walletAddress as Address,
    indexId,
  );
  const quotes = await quoteAtRates(reads);
  const lots = reads.map((read) => ({ ...read, indexId }));
  const holdings = valueHoldings(lots, quotes).map(
    ({ venueId, assetSymbol, amount, valueUsd }) => ({
      venueId,
      assetSymbol,
      amount,
      valueUsd,
    }),
  );
  const valueUsd = holdings.reduce((sum, h) => sum + h.valueUsd, 0);
  return { valueUsd, holdings };
}

async function plannedLegs(
  user: UserRow,
  wallet: Address,
  body: CreateWithdrawBody,
): Promise<HoldingLeg[]> {
  const reads = await readIndexHoldings(user.id, wallet, body.indexId);
  const legs = planWithdrawLegs(reads, body.fraction);
  if (legs.length === 0)
    throw new ExecutionRequestError(
      400,
      "NOTHING_TO_WITHDRAW",
      "You have nothing to withdraw from this index.",
    );
  assertLiquidity(legs);
  return legs;
}

export async function prepareWithdraw(
  user: UserRow,
  wallet: Address,
  body: CreateWithdrawBody,
): Promise<NewExecution> {
  const legs = await plannedLegs(user, wallet, body);
  const symbols = [...new Set(legs.map((leg) => leg.holding.assetSymbol))];
  return {
    kind: "withdraw",
    userId: user.id,
    indexId: body.indexId,
    depositAsset: symbols.join(","),
    depositAmountBase: 0n,
    valueUsd: await legsValueUsd(legs),
    steps: withdrawSteps(legs),
  };
}
