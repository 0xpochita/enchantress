import { yearlyRewardsUsd } from "./yield-index.ts";

export interface RouteCandidate {
  indexId: string;
  apy: number;
  assetCount: number;
}

export interface RankedRoute {
  indexId: string;
  apy: number;
  yearlyUsd: number;
  feeUsd: number;
  deltaPct: number;
  isBest: boolean;
}

const BASE_FEE_USD = 0.01;
const CROSS_CHAIN_FEE_USD = 0.05;
const PER_ASSET_FEE_USD = 0.01;
const PERCENT = 100;

export function estimateRouteFeeUsd(
  isCrossChain: boolean,
  assetCount: number,
): number {
  const bridgeFee = isCrossChain ? CROSS_CHAIN_FEE_USD : BASE_FEE_USD;
  return bridgeFee + assetCount * PER_ASSET_FEE_USD;
}

export function rankRoutes(
  candidates: RouteCandidate[],
  amountUsd: number,
  isCrossChain: boolean,
): RankedRoute[] {
  const quoted = candidates
    .map((c) => ({
      indexId: c.indexId,
      apy: c.apy,
      yearlyUsd: yearlyRewardsUsd(amountUsd, c.apy),
      feeUsd: estimateRouteFeeUsd(isCrossChain, c.assetCount),
    }))
    .sort((a, b) => b.apy - a.apy);
  const bestApy = quoted[0]?.apy ?? 0;
  return quoted.map((route, position) => ({
    ...route,
    deltaPct: bestApy === 0 ? 0 : ((route.apy - bestApy) / bestApy) * PERCENT,
    isBest: position === 0,
  }));
}
