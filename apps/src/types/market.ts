export type ChainId = string;

export interface Chain {
  id: ChainId;
  name: string;
  iconKey: string;
}

export interface Token {
  id: string;
  symbol: string;
  name: string;
  chainId: ChainId;
  iconKey: string;
  priceUsd: number;
}

export interface WalletBalance {
  tokenId: string;
  amount: number;
}

export interface VenueMarket {
  assetSymbol: string;
  apy: number;
}

export interface Venue {
  id: string;
  name: string;
  iconKey: string;
  chainId: ChainId;
  markets: VenueMarket[];
}

export interface Aggregator {
  id: string;
  name: string;
  description: string;
  venueIds: string[];
}

export interface VaultAsset {
  symbol: string;
  name: string;
  iconKey: string;
  priceUsd: number;
}

export interface BasketAllocation {
  assetSymbol: string;
  weight: number;
  venueId: string;
  priceChangePct: number;
}

export interface Basket {
  id: string;
  name: string;
  aggregatorId: string;
  creator: string;
  createdAt: string;
  tvlUsd: number;
  positionUsd: number;
  isCreatedByUser: boolean;
  isJoined: boolean;
  allocations: BasketAllocation[];
}

export interface RoutedAllocation {
  asset: VaultAsset;
  venue: Venue;
  weight: number;
  apy: number;
  valueUsd: number;
}

export interface BasketQuote {
  id: string;
  name: string;
  aggregatorId: string;
  aggregatorName: string;
  apy: number;
  assets: { symbol: string; iconKey: string }[];
}
