import assert from "node:assert/strict";
import { test } from "node:test";
import type { Venue } from "../../../types/market.ts";
import { eligibleVenues } from "./eligibility.ts";

const market = (assetSymbol: string, tvlUsd: number) => ({
  assetSymbol,
  apy: 4,
  tvlUsd,
  liquidityUsd: tvlUsd,
});

const venue = (id: string, markets: Venue["markets"]): Venue => ({
  id,
  name: id,
  iconKey: "generic",
  chainId: "monad",
  markets,
});

test("eligibleVenues drops thin markets and venues left without markets", () => {
  const venues = [
    venue("big", [market("USDC", 1_000_000), market("WETH", 10)]),
    venue("thin", [market("USDC", 12_000)]),
  ];
  const result = eligibleVenues(venues, 250_000);
  assert.deepEqual(
    result.map((v) => [v.id, v.markets.map((m) => m.assetSymbol)]),
    [["big", ["USDC"]]],
  );
});

test("eligibleVenues keeps everything when the threshold is zero", () => {
  const venues = [venue("any", [market("USDC", 0)])];
  assert.equal(eligibleVenues(venues, 0).length, 1);
});
