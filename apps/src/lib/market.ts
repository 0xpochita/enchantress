import { BASKETS } from "@/lib/mock/baskets";
import { CHAINS } from "@/lib/mock/chains";
import {
  POPULAR_TOKEN_IDS,
  TOKENS,
  WALLET_ADDRESS,
  WALLET_BALANCES,
} from "@/lib/mock/tokens";
import {
  AGGREGATORS,
  VAULT_ASSETS,
  VAULT_CHAIN_ID,
  VENUES,
} from "@/lib/mock/vaults";
import type {
  Aggregator,
  Basket,
  Chain,
  RoutedAllocation,
  Token,
  VaultAsset,
  Venue,
} from "@/types/market";
import { blendedApy } from "@/utils/basket";

export { POPULAR_TOKEN_IDS, VAULT_CHAIN_ID, WALLET_ADDRESS, WALLET_BALANCES };

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

export function getBaskets(aggregatorId?: string): Basket[] {
  if (!aggregatorId) return BASKETS;
  return BASKETS.filter((basket) => basket.aggregatorId === aggregatorId);
}

export function getBasket(basketId: string): Basket | undefined {
  return BASKETS.find((basket) => basket.id === basketId);
}

export function routeBasket(
  basket: Basket,
  totalUsd: number,
): RoutedAllocation[] {
  return basket.allocations.flatMap((allocation) => {
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

export function getBasketApy(basket: Basket): number {
  return blendedApy(routeBasket(basket, 0));
}

export function getBestVenueApy(venues: Venue[] = VENUES): number {
  return Math.max(
    0,
    ...venues.flatMap((venue) => venue.markets.map((m) => m.apy)),
  );
}
