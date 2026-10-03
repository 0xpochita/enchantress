import "server-only";
import { serverEnv } from "@/config/env.server";
import { listIndexes } from "@/features/indexes/services/index-repository";
import {
  type IndexSummary,
  type MarketCatalog,
  summarizeIndex,
  usesVenue,
} from "@/features/indexes/utils/route-index";
import { VAULT_CHAIN_ID } from "@/features/vaults/config/venues";
import { getVenueSnapshot } from "@/features/vaults/services/venue-snapshot";
import { eligibleVenues } from "@/features/vaults/utils/eligibility";
import { CHAINS } from "@/lib/mock/chains";
import {
  DEFAULT_DEPOSIT_TOKEN_ID,
  POPULAR_TOKEN_IDS,
  TOKENS,
  WALLET_BALANCES,
} from "@/lib/mock/tokens";
import type { Chain, Token, VaultAsset, Venue } from "@/types/market";

export {
  DEFAULT_DEPOSIT_TOKEN_ID,
  POPULAR_TOKEN_IDS,
  VAULT_CHAIN_ID,
  WALLET_BALANCES,
};

export type { IndexSummary, MarketCatalog };

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

export async function getMarketCatalog(): Promise<MarketCatalog> {
  const snapshot = await getVenueSnapshot();
  return {
    venues: eligibleVenues(snapshot.venues, serverEnv().VENUE_MIN_TVL_USD),
    assets: snapshot.assets,
  };
}

export async function getAllVenues(): Promise<Venue[]> {
  return (await getVenueSnapshot()).venues;
}

export async function getVenue(venueId: string): Promise<Venue | undefined> {
  return (await getAllVenues()).find((venue) => venue.id === venueId);
}

export function getBestVenueApy(venues: Venue[]): number {
  return Math.max(
    0,
    ...venues.flatMap((venue) => venue.markets.map((m) => m.apy)),
  );
}

export async function getIndexSummaries(
  venueId?: string,
): Promise<IndexSummary[]> {
  const [indexes, catalog] = await Promise.all([
    listIndexes(),
    getMarketCatalog(),
  ]);
  const summaries = indexes.map((index) => summarizeIndex(index, catalog));
  if (!venueId) return summaries;
  return summaries.filter((summary) => usesVenue(summary, venueId));
}

export async function getIndexSummary(
  indexId: string,
): Promise<IndexSummary | undefined> {
  const summaries = await getIndexSummaries();
  return summaries.find((summary) => summary.index.id === indexId);
}

export type { VaultAsset };
