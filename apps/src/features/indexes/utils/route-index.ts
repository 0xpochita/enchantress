import type {
  Index,
  RoutedAllocation,
  VaultAsset,
  Venue,
} from "../../../types/market";
import { blendedApy, findBestMarket } from "../../../utils/yield-index.ts";

export interface MarketCatalog {
  venues: Venue[];
  assets: VaultAsset[];
}

export interface IndexSummary {
  index: Index;
  allocations: RoutedAllocation[];
  apy: number;
}

export function routeIndex(
  index: Index,
  totalUsd: number,
  catalog: MarketCatalog,
): RoutedAllocation[] {
  return index.allocations.flatMap((allocation) => {
    const asset = catalog.assets.find(
      (a) => a.symbol === allocation.assetSymbol,
    );
    const best = findBestMarket(catalog.venues, allocation.assetSymbol);
    if (!asset || !best) return [];
    return [
      {
        asset,
        venue: best.venue,
        weight: allocation.weight,
        apy: best.apy,
        valueUsd: totalUsd * allocation.weight,
      },
    ];
  });
}

export function summarizeIndex(
  index: Index,
  catalog: MarketCatalog,
): IndexSummary {
  const allocations = routeIndex(index, index.tvlUsd, catalog);
  return { index, allocations, apy: blendedApy(allocations) };
}

export function usesVenue(summary: IndexSummary, venueId: string): boolean {
  return summary.allocations.some((a) => a.venue.id === venueId);
}
