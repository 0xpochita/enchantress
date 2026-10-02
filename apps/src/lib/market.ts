import { CHAINS } from "@/lib/mock/chains";
import { INDEXES } from "@/lib/mock/indexes";
import { PORTFOLIO_AS_OF, USER_PURCHASES } from "@/lib/mock/portfolio";
import {
  DEFAULT_DEPOSIT_TOKEN_ID,
  POPULAR_TOKEN_IDS,
  TOKENS,
  WALLET_BALANCES,
} from "@/lib/mock/tokens";
import { buildTransactions } from "@/lib/mock/transactions";
import {
  AGGREGATORS,
  VAULT_ASSETS,
  VAULT_CHAIN_ID,
  VENUES,
} from "@/lib/mock/vaults";
import type {
  Aggregator,
  Chain,
  Index,
  IndexTransaction,
  RoutedAllocation,
  Token,
  VaultAsset,
  Venue,
} from "@/types/market";
import { blendedApy } from "@/utils/yield-index";

export {
  DEFAULT_DEPOSIT_TOKEN_ID,
  PORTFOLIO_AS_OF,
  POPULAR_TOKEN_IDS,
  VAULT_CHAIN_ID,
  WALLET_BALANCES,
};

export function getChains(): Chain[] {
  return CHAINS;
}

export function getChain(chainId: string): Chain | undefined {
  return CHAINS.find((chain) => chain.id === chainId);
}

export function getTokens(): Token[] {
  return TOKENS;
}

export function getToken(tokenId: string): Token | undefined {
  return TOKENS.find((token) => token.id === tokenId);
}

export function getVaultAssets(): VaultAsset[] {
  return VAULT_ASSETS;
}

export function getVaultAsset(symbol: string): VaultAsset | undefined {
  return VAULT_ASSETS.find((asset) => asset.symbol === symbol);
}

export function getVenue(venueId: string): Venue | undefined {
  return VENUES.find((venue) => venue.id === venueId);
}

export function getVenues(): Venue[] {
  return VENUES;
}

export function getAggregators(): Aggregator[] {
  return AGGREGATORS;
}

export function getAggregator(aggregatorId: string): Aggregator | undefined {
  return AGGREGATORS.find((aggregator) => aggregator.id === aggregatorId);
}

export function getAggregatorVenues(aggregator: Aggregator): Venue[] {
  return VENUES.filter((venue) => aggregator.venueIds.includes(venue.id));
}

export function getIndexes(aggregatorId?: string): Index[] {
  if (!aggregatorId) return INDEXES;
  return INDEXES.filter((index) => index.aggregatorId === aggregatorId);
}

export function getIndex(indexId: string): Index | undefined {
  return INDEXES.find((index) => index.id === indexId);
}

export function routeIndex(index: Index, totalUsd: number): RoutedAllocation[] {
  return index.allocations.flatMap((allocation) => {
    const asset = getVaultAsset(allocation.assetSymbol);
    const venue = getVenue(allocation.venueId);
    const market = venue?.markets.find(
      (m) => m.assetSymbol === allocation.assetSymbol,
    );
    if (!asset || !venue || !market) return [];
    return [
      {
        asset,
        venue,
        weight: allocation.weight,
        apy: market.apy,
        valueUsd: totalUsd * allocation.weight,
      },
    ];
  });
}

export function getIndexApy(index: Index): number {
  return blendedApy(routeIndex(index, 0));
}

export function getBestVenueApy(venues: Venue[] = VENUES): number {
  return Math.max(
    0,
    ...venues.flatMap((venue) => venue.markets.map((m) => m.apy)),
  );
}

const TRANSACTIONS = buildTransactions(INDEXES.map((index) => index.id));

export function getIndexTransactions(indexId: string): IndexTransaction[] {
  return TRANSACTIONS.filter((tx) => tx.indexId === indexId);
}

export interface PortfolioPosition {
  index: Index;
  apy: number;
  allocations: RoutedAllocation[];
}

export function getPositions(): PortfolioPosition[] {
  return INDEXES.filter((index) => index.positionUsd > 0)
    .map((index) => ({
      index,
      apy: getIndexApy(index),
      allocations: routeIndex(index, index.positionUsd),
    }))
    .sort((a, b) => b.index.positionUsd - a.index.positionUsd);
}

export function getUserPurchases(): IndexTransaction[] {
  return [...USER_PURCHASES].sort(
    (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
  );
}
