import "server-only";
import { unstable_cache } from "next/cache";
import { MONAD_TOKEN_LIST } from "@/features/chain/config/tokens";
import { monadClient } from "@/features/chain/services/public-client";
import type { VaultAsset, Venue } from "@/types/market";
import {
  VAULT_CHAIN_ID,
  VENUE_CONFIGS,
  type VenueConfig,
} from "../config/venues";
import type { MarketRead, PriceOf, VaultAdapter } from "../types";
import { vaultAdapter, venueConfig } from "./vault-adapters";

const SNAPSHOT_REVALIDATE_SECONDS = 60;

export interface VenueSnapshot {
  venues: Venue[];
  assets: VaultAsset[];
}

function toVenue(config: VenueConfig, markets: MarketRead[]): Venue {
  return {
    id: config.id,
    name: config.name,
    iconKey: config.iconKey,
    chainId: VAULT_CHAIN_ID,
    markets: markets.map(({ assetSymbol, apy, tvlUsd, liquidityUsd }) => ({
      assetSymbol,
      apy,
      tvlUsd,
      liquidityUsd,
    })),
  };
}

function collectPrices(reads: MarketRead[][], prices: Map<string, number>) {
  for (const market of reads.flat()) {
    if (!prices.has(market.assetSymbol))
      prices.set(market.assetSymbol, market.priceUsd);
  }
}

function pricedAssets(prices: Map<string, number>): VaultAsset[] {
  return MONAD_TOKEN_LIST.flatMap((token) => {
    const priceUsd = prices.get(token.symbol);
    if (priceUsd === undefined) return [];
    return [
      {
        symbol: token.symbol,
        name: token.name,
        iconKey: token.iconKey,
        priceUsd,
      },
    ];
  });
}

function readMarkets(configs: VenueConfig[], priceUsd: PriceOf) {
  return Promise.all(
    configs.map((config) =>
      vaultAdapter(config, monadClient()).readMarkets(priceUsd),
    ),
  );
}

async function readVenueSnapshot(): Promise<VenueSnapshot> {
  const prices = new Map<string, number>();
  const priceUsd: PriceOf = (symbol) => prices.get(symbol);
  const poolConfigs = VENUE_CONFIGS.filter((c) => c.kind === "aave-pool");
  const poolReads = await readMarkets(poolConfigs, priceUsd);
  collectPrices(poolReads, prices);
  const vaultConfigs = VENUE_CONFIGS.filter((c) => c.kind === "erc4626");
  const vaultReads = await readMarkets(vaultConfigs, priceUsd);
  const byId = new Map<string, MarketRead[]>([
    ...poolConfigs.map((config, i) => [config.id, poolReads[i]] as const),
    ...vaultConfigs.map((config, i) => [config.id, vaultReads[i]] as const),
  ]);
  return {
    venues: VENUE_CONFIGS.map((config) =>
      toVenue(config, byId.get(config.id) ?? []),
    ),
    assets: pricedAssets(prices),
  };
}

export const getVenueSnapshot = unstable_cache(
  readVenueSnapshot,
  ["venue-snapshot"],
  { revalidate: SNAPSHOT_REVALIDATE_SECONDS, tags: ["vaults"] },
);

export function createAdapter(venueId: string): VaultAdapter | undefined {
  const config = venueConfig(venueId);
  return config ? vaultAdapter(config, monadClient()) : undefined;
}
