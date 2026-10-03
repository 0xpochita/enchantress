import "server-only";
import { unstable_cache } from "next/cache";
import { MONAD_TOKEN_LIST } from "@/features/chain/config/tokens";
import type { VaultAsset, Venue } from "@/types/market";
import {
  VAULT_CHAIN_ID,
  VENUE_CONFIGS,
  type VenueConfig,
} from "../config/venues";
import type { MarketRead, VaultAdapter } from "../types";
import { AavePoolAdapter } from "./aave-pool-adapter";
import { Erc4626Adapter } from "./erc4626-adapter";

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

function collectPrices(reads: MarketRead[][]): Map<string, number> {
  const prices = new Map<string, number>();
  for (const market of reads.flat()) {
    if (!prices.has(market.assetSymbol))
      prices.set(market.assetSymbol, market.priceUsd);
  }
  return prices;
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

async function readVenueSnapshot(): Promise<VenueSnapshot> {
  const poolConfigs = VENUE_CONFIGS.filter((c) => c.kind === "aave-pool");
  const poolReads = await Promise.all(
    poolConfigs.map((config) => new AavePoolAdapter(config).readMarkets()),
  );
  const prices = collectPrices(poolReads);
  const vaultConfigs = VENUE_CONFIGS.filter((c) => c.kind === "erc4626");
  const vaultReads = await Promise.all(
    vaultConfigs.map((config) =>
      new Erc4626Adapter(config, (symbol) => prices.get(symbol)).readMarkets(),
    ),
  );
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

export function createAdapter(
  venueId: string,
  priceUsd: (symbol: string) => number | undefined,
): VaultAdapter | undefined {
  const config = VENUE_CONFIGS.find((c) => c.id === venueId);
  if (!config) return undefined;
  return config.kind === "aave-pool"
    ? new AavePoolAdapter(config)
    : new Erc4626Adapter(config, priceUsd);
}
