import "server-only";
import type { Address } from "viem";
import { VENUE_CONFIGS } from "@/features/vaults/config/venues";
import { getVenueSnapshot } from "@/features/vaults/services/venue-snapshot";
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

async function priceLookup(): Promise<(symbol: string) => number> {
  const { assets } = await getVenueSnapshot();
  return (symbol) => assets.find((a) => a.symbol === symbol)?.priceUsd ?? 0;
}

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

function legValueUsd(leg: HoldingLeg, price: (s: string) => number): number {
  const { holding } = leg;
  if (holding.units === 0n) return 0;
  const assets = (holding.assets * leg.units) / holding.units;
  return baseToAmount(holding.assetSymbol, assets) * price(holding.assetSymbol);
}

export async function previewIndexPosition(
  user: UserRow,
  indexId: string,
): Promise<IndexPosition> {
  if (!user.walletAddress) return { valueUsd: 0, holdings: [] };
  const [reads, price] = await Promise.all([
    readIndexHoldings(user.id, user.walletAddress as Address, indexId),
    priceLookup(),
  ]);
  const holdings = reads.map((read) => {
    const amount = baseToAmount(read.assetSymbol, read.assets);
    return {
      venueId: read.venueId,
      assetSymbol: read.assetSymbol,
      amount,
      valueUsd: amount * price(read.assetSymbol),
    };
  });
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
  const price = await priceLookup();
  const symbols = [...new Set(legs.map((leg) => leg.holding.assetSymbol))];
  return {
    kind: "withdraw",
    userId: user.id,
    indexId: body.indexId,
    depositAsset: symbols.join(","),
    depositAmountBase: 0n,
    valueUsd: legs.reduce((sum, leg) => sum + legValueUsd(leg, price), 0),
    steps: withdrawSteps(legs),
  };
}
