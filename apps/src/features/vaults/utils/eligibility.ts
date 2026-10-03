import type { Venue } from "@/types/market";

export function eligibleVenues(venues: Venue[], minTvlUsd: number): Venue[] {
  return venues
    .map((venue) => ({
      ...venue,
      markets: venue.markets.filter((market) => market.tvlUsd >= minTvlUsd),
    }))
    .filter((venue) => venue.markets.length > 0);
}

export function getBestVenueApy(venues: Venue[]): number {
  return Math.max(
    0,
    ...venues.flatMap((venue) => venue.markets.map((m) => m.apy)),
  );
}
