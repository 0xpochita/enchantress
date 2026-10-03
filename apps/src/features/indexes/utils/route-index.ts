import type {
  Index,
  RoutedAllocation,
  VaultAsset,
  Venue,
} from "../../../types/market";
import { blendedApy, findBestMarket } from "../../../utils/yield-index.ts";

const BPS = 10_000;

export interface MarketCatalog {
  venues: Venue[];
  assets: VaultAsset[];
}

export interface IndexSummary {
  index: Index;
  allocations: RoutedAllocation[];
  apy: number;
}

export interface WeightedAsset {
  assetSymbol: string;
  weightBps: number;
}

export interface RoutedSlice extends WeightedAsset {
  venueId: string;
}

export type SliceRouting =
  | { ok: true; slices: RoutedSlice[] }
  | { ok: false; unroutableAsset: string };

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

export function weightedAssets(index: Index): WeightedAsset[] {
  return index.allocations.map((allocation) => ({
    assetSymbol: allocation.assetSymbol,
    weightBps: Math.round(allocation.weight * BPS),
  }));
}

export function routeSlices(
  allocations: WeightedAsset[],
  catalog: MarketCatalog,
): SliceRouting {
  const slices: RoutedSlice[] = [];
  for (const allocation of allocations) {
    const { assetSymbol } = allocation;
    const best = findBestMarket(catalog.venues, assetSymbol);
    const isPriced = catalog.assets.some((a) => a.symbol === assetSymbol);
    if (!best || !isPriced) return { ok: false, unroutableAsset: assetSymbol };
    slices.push({ ...allocation, venueId: best.venue.id });
  }
  return { ok: true, slices };
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
