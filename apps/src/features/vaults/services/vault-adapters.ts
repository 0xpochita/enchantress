import type { PublicClient } from "viem";
import { VENUE_CONFIGS, type VenueConfig } from "../config/venues.ts";
import type { VaultAdapter, VenueCalls } from "../types.ts";
import { aavePoolAdapter, aavePoolCalls } from "./aave-pool-adapter.ts";
import { erc4626Adapter, erc4626Calls } from "./erc4626-adapter.ts";

export function venueConfig(venueId: string): VenueConfig | undefined {
  return VENUE_CONFIGS.find((venue) => venue.id === venueId);
}

export function venueSupportsAsset(
  venueId: string,
  assetSymbol: string,
): boolean {
  const venue = venueConfig(venueId);
  if (!venue) return false;
  const assets: string[] =
    venue.kind === "aave-pool" ? venue.assets : Object.keys(venue.vaults);
  return assets.includes(assetSymbol);
}

export function venueCalls(venue: VenueConfig): VenueCalls {
  return venue.kind === "aave-pool"
    ? aavePoolCalls(venue)
    : erc4626Calls(venue);
}

export function vaultAdapter(
  venue: VenueConfig,
  client: PublicClient,
): VaultAdapter {
  return venue.kind === "aave-pool"
    ? aavePoolAdapter(venue, client)
    : erc4626Adapter(venue, client);
}
