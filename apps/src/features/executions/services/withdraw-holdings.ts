import "server-only";
import type { Address } from "viem";
import { createAdapter } from "@/features/vaults/services/venue-snapshot";
import {
  indexLotGroups,
  type LotGroup,
  type WithdrawHolding,
} from "../utils/withdraw";
import { type LotTotal, userLotTotals } from "./execution-repository";

export interface HoldingRead extends WithdrawHolding {
  maxUnits: bigint;
  availableAssets: bigint;
}

function smaller(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

async function readHolding(
  group: LotGroup<LotTotal>,
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
    maxUnits: read.maxUnits,
    availableAssets: read.availableAssets,
  };
}

export async function readIndexHoldings(
  userId: string,
  user: Address,
  indexId: string,
): Promise<HoldingRead[]> {
  const groups = indexLotGroups(await userLotTotals(userId), indexId);
  const reads = await Promise.all(groups.map((g) => readHolding(g, user)));
  return reads.filter((read) => read.units > 0n);
}
