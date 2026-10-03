import "server-only";
import { serverEnv } from "@/config/env.server";
import { getVenueSnapshot } from "@/features/vaults/services/venue-snapshot";
import { eligibleVenues } from "@/features/vaults/utils/eligibility";
import {
  type IndexSummary,
  type MarketCatalog,
  routeSlices,
  type SliceRouting,
  summarizeIndex,
  usesVenue,
  weightedAssets,
} from "../utils/route-index";
import { findIndex, listIndexes } from "./index-repository";

export interface DepositRouting {
  summary: IndexSummary;
  routing: SliceRouting;
}

export async function getMarketCatalog(): Promise<MarketCatalog> {
  const snapshot = await getVenueSnapshot();
  return {
    venues: eligibleVenues(snapshot.venues, serverEnv().VENUE_MIN_TVL_USD),
    assets: snapshot.assets,
  };
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
  const [index, catalog] = await Promise.all([
    findIndex(indexId),
    getMarketCatalog(),
  ]);
  return index && summarizeIndex(index, catalog);
}

export async function routeIndexForDeposit(
  indexId: string,
): Promise<DepositRouting | undefined> {
  const [index, catalog] = await Promise.all([
    findIndex(indexId),
    getMarketCatalog(),
  ]);
  if (!index) return undefined;
  return {
    summary: summarizeIndex(index, catalog),
    routing: routeSlices(weightedAssets(index), catalog),
  };
}
