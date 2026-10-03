import "server-only";
import type { Address } from "viem";
import { unitsToAssets } from "@/features/portfolio/utils/lots";
import { createAdapter } from "@/features/vaults/services/venue-snapshot";
import type { WithdrawHolding } from "../utils/withdraw";
import { type LotTotal, userLotTotals } from "./execution-repository";

export interface HoldingRead extends WithdrawHolding {
  assets: bigint;
  maxUnits: bigint;
  availableAssets: bigint;
}

interface LotGroup {
  lot: LotTotal;
  otherUnits: bigint;
}

function smaller(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

function groupLots(totals: LotTotal[], indexId: string): LotGroup[] {
  const sameMarket = (a: LotTotal, b: LotTotal) =>
    a.venueId === b.venueId && a.assetSymbol === b.assetSymbol;
  return totals
    .filter((lot) => lot.indexId === indexId && lot.units > 0n)
    .map((lot) => ({
      lot,
      otherUnits: totals
        .filter((other) => other.indexId !== indexId && sameMarket(other, lot))
        .reduce((sum, other) => sum + other.units, 0n),
    }));
}

async function readHolding(
  group: LotGroup,
  user: Address,
): Promise<HoldingRead> {
  const { venueId, assetSymbol } = group.lot;
  const adapter = createAdapter(venueId);
  if (!adapter) throw new Error(`Unknown venue ${venueId}`);
  const read = await adapter.readHolding(user, assetSymbol);
  const units = smaller(group.lot.units, read.heldUnits);
  return {
    venueId,
    assetSymbol,
    units,
    otherUnits: group.otherUnits,
    rateRay: read.rateRay,
    exit: adapter,
    assets: unitsToAssets(units, read.rateRay),
    maxUnits: read.maxUnits,
    availableAssets: read.availableAssets,
  };
}

export async function readIndexHoldings(
  userId: string,
  user: Address,
  indexId: string,
): Promise<HoldingRead[]> {
  const groups = groupLots(await userLotTotals(userId), indexId);
  const reads = await Promise.all(groups.map((g) => readHolding(g, user)));
  return reads.filter((read) => read.units > 0n);
}
