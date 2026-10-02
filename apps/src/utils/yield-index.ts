import type { Venue } from "../types/market";

const WEIGHT_TOLERANCE = 0.0001;

export interface BestMarket {
  venue: Venue;
  apy: number;
}

export interface WeightedApy {
  weight: number;
  apy: number;
}

export function findBestMarket(
  venues: Venue[],
  assetSymbol: string,
): BestMarket | undefined {
  let best: BestMarket | undefined;
  for (const venue of venues) {
    const market = venue.markets.find((m) => m.assetSymbol === assetSymbol);
    if (market && (!best || market.apy > best.apy)) {
      best = { venue, apy: market.apy };
    }
  }
  return best;
}

export function equalWeights(count: number): number[] {
  if (count <= 0) return [];
  return Array.from({ length: count }, () => 1 / count);
}

export function blendedApy(allocations: WeightedApy[]): number {
  return allocations.reduce((sum, { weight, apy }) => sum + weight * apy, 0);
}

export function yearlyRewardsUsd(amountUsd: number, apy: number): number {
  return (amountUsd * apy) / 100;
}

export function areWeightsComplete(weights: number[]): boolean {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.length > 0 && Math.abs(total - 1) < WEIGHT_TOLERANCE;
}
