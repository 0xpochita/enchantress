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

function draftErrors(
  state: DraftState,
  weights: number[],
  depositUsd: number,
): string[] {
  return [
    state.name.trim() === "" ? "Give your index a name." : "",
    weights.length === 0 ? "Pick at least one asset." : "",
    depositUsd <= 0 ? "Enter a deposit amount." : "",
    weights.length > 0 && !areWeightsComplete(weights)
      ? "Custom weights must add up to 100%."
      : "",
  ].filter(Boolean);
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
  const errors = draftErrors(state, weights, depositUsd);
  return {
    availableAssets,
    allocations,
    depositToken,
    depositUsd,
    apy,
    rewardsUsd,
    errors,
  };
}
