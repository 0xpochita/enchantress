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
  tvlUsd: number;
  liquidityUsd: number;
}

export interface Venue {
  id: string;
  name: string;
  iconKey: string;
  chainId: ChainId;
  markets: VenueMarket[];
}

export interface VaultAsset {
  symbol: string;
  name: string;
  iconKey: string;
  priceUsd: number;
}

export interface IndexAllocation {
  assetSymbol: string;
  weight: number;
}

export interface Index {
  id: string;
  name: string;
  creator: string;
  createdAt: string;
  tvlUsd: number;
  positionUsd: number;
  isCreatedByUser: boolean;
  allocations: IndexAllocation[];
  isFeatured: boolean;
}

export interface RoutedAllocation {
  asset: VaultAsset;
  venue: Venue;
  weight: number;
  apy: number;
  valueUsd: number;
}

export interface IndexQuote {
  id: string;
  name: string;
  apy: number;
  assets: { symbol: string; iconKey: string }[];
  venues: { id: string; name: string; iconKey: string }[];
}

export interface IndexTransaction {
  hash: string;
  indexId: string;
  account: string;
  tokenId: string;
  amount: number;
  valueUsd: number;
  timestamp: string;
}
