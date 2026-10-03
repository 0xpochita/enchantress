import type { VenueConfig } from "../config/venues.ts";
import { UnknownMarketError } from "../errors.ts";
import { venueCalls } from "../services/vault-adapters.ts";
import type { VaultAdapter } from "../types.ts";
import { RAY } from "../utils/aave-math.ts";

export interface MemoryMarket {
  units: bigint;
  rateRay: bigint;
  availableAssets: bigint;
}

export type MemoryMarkets = Map<string, MemoryMarket>;

export function memoryAdapter(
  venue: VenueConfig,
  markets: MemoryMarkets,
): VaultAdapter {
  const market = (symbol: string) => {
    const found = markets.get(symbol);
    if (!found) throw new UnknownMarketError(venue.name, symbol);
    return found;
  };
  return {
    ...venueCalls(venue),
    readMarkets: async () => [],
    rate: async (symbol) => market(symbol).rateRay,
    readHolding: async (_owner, symbol) => {
      const { units, rateRay, availableAssets } = market(symbol);
      const maxUnits = (availableAssets * RAY) / rateRay;
      return { heldUnits: units, maxUnits, availableAssets, rateRay };
    },
    unitsBefore: async (_owner, symbol) => market(symbol).units,
    suppliedUnits: async (change) =>
      market(change.assetSymbol).units - (change.unitsBefore ?? 0n),
    burnedUnits: async (change) =>
      (change.unitsBefore ?? 0n) - market(change.assetSymbol).units,
  };
}
