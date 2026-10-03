import type {
  RoutedAllocation,
  Token,
  VaultAsset,
  Venue,
} from "../types/market";
import {
  areWeightsComplete,
  blendedApy,
  equalWeights,
  findBestMarket,
  yearlyRewardsUsd,
} from "./yield-index.ts";

export type WeightMode = "equal" | "custom";

export interface DraftCatalog {
  venues: Venue[];
  vaultAssets: VaultAsset[];
  tokens: Token[];
  defaultDepositTokenId: string;
}

export interface DraftState {
  name: string;
  assetSymbols: string[];
  weightMode: WeightMode;
  customPercents: Record<string, number>;
  amount: string;
  depositTokenId: string;
}

const PERCENT = 100;
const BPS = 10_000;

export const INDEX_NAME_MIN_LENGTH = 3;
export const INDEX_NAME_MAX_LENGTH = 40;
export const MAX_INDEX_ASSETS = 6;

export interface IndexRecipe {
  name: string;
  allocations: { assetSymbol: string; weightBps: number }[];
}

export function toWeightBps(weights: number[]): number[] {
  const bps = weights.map((weight) => Math.round(weight * BPS));
  const drift = BPS - bps.reduce((sum, value) => sum + value, 0);
  if (bps.length > 0) bps[bps.length - 1] += drift;
  return bps;
}

function draftWeights(state: DraftState, assets: VaultAsset[]): number[] {
  if (state.weightMode === "equal") return equalWeights(assets.length);
  return assets.map((a) => (state.customPercents[a.symbol] ?? 0) / PERCENT);
}

function routeAssets(
  assets: VaultAsset[],
  weights: number[],
  context: { venues: Venue[]; depositUsd: number },
): RoutedAllocation[] {
  return assets.flatMap((asset, position) => {
    const best = findBestMarket(context.venues, asset.symbol);
    if (!best) return [];
    const weight = weights[position] ?? 0;
    const valueUsd = context.depositUsd * weight;
    return [{ asset, venue: best.venue, apy: best.apy, weight, valueUsd }];
  });
}

function nameError(name: string): string {
  const length = name.trim().length;
  if (length === 0) return "Give your index a name.";
  if (length < INDEX_NAME_MIN_LENGTH || length > INDEX_NAME_MAX_LENGTH)
    return `Use ${INDEX_NAME_MIN_LENGTH} to ${INDEX_NAME_MAX_LENGTH} characters for the name.`;
  return "";
}

function draftErrors(state: DraftState, weights: number[]): string[] {
  const hasBadAmount = state.amount !== "" && !(Number(state.amount) > 0);
  return [
    nameError(state.name),
    weights.length === 0 ? "Pick at least one asset." : "",
    weights.length > MAX_INDEX_ASSETS
      ? `Pick at most ${MAX_INDEX_ASSETS} assets.`
      : "",
    hasBadAmount ? "Enter a valid deposit amount." : "",
    weights.length > 0 && !areWeightsComplete(weights)
      ? "Custom weights must add up to 100%."
      : "",
  ].filter(Boolean);
}

function draftRecipe(
  state: DraftState,
  allocations: RoutedAllocation[],
): IndexRecipe {
  const bps = toWeightBps(allocations.map((a) => a.weight));
  return {
    name: state.name.trim(),
    allocations: allocations.map((a, position) => ({
      assetSymbol: a.asset.symbol,
      weightBps: bps[position] ?? 0,
    })),
  };
}

export function deriveDraft(catalog: DraftCatalog, state: DraftState) {
  const venues = catalog.venues;
  const availableAssets = catalog.vaultAssets.filter((a) =>
    findBestMarket(venues, a.symbol),
  );
  const assets = availableAssets.filter((a) =>
    state.assetSymbols.includes(a.symbol),
  );
  const weights = draftWeights(state, assets);
  const depositToken = catalog.tokens.find(
    (t) => t.id === state.depositTokenId,
  );
  const depositUsd =
    (Number(state.amount) || 0) * (depositToken?.priceUsd ?? 0);
  const allocations = routeAssets(assets, weights, { venues, depositUsd });
  const apy = blendedApy(allocations);
  const rewardsUsd = yearlyRewardsUsd(depositUsd, apy);
  const errors = draftErrors(state, weights);
  return {
    availableAssets,
    allocations,
    depositToken,
    depositUsd,
    apy,
    rewardsUsd,
    errors,
    recipe: draftRecipe(state, allocations),
  };
}
