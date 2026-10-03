import type { Venue } from "@/types/market";

export function eligibleVenues(venues: Venue[], minTvlUsd: number): Venue[] {
  return venues
    .map((venue) => ({
      ...venue,
      markets: venue.markets.filter((market) => market.tvlUsd >= minTvlUsd),
    }))
    .filter((venue) => venue.markets.length > 0);
}
