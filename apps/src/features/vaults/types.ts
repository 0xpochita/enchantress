import type { Address } from "viem";
import type { VenueConfig } from "./config/venues";

export interface MarketRead {
  assetSymbol: string;
  apy: number;
  tvlUsd: number;
  liquidityUsd: number;
  priceUsd: number;
}

export interface PositionRead {
  units: bigint;
  assets: bigint;
}

export interface VaultAdapter {
  readonly venue: VenueConfig;
  readMarkets(): Promise<MarketRead[]>;
  readPosition(user: Address, assetSymbol: string): Promise<PositionRead>;
}
