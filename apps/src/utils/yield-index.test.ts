import assert from "node:assert/strict";
import { test } from "node:test";
import type { Venue } from "../types/market.ts";
import {
  areWeightsComplete,
  blendedApy,
  equalWeights,
  findBestMarket,
  findMarket,
  yearlyRewardsUsd,
} from "./yield-index.ts";

const VENUES: Venue[] = [
  {
    id: "low",
    name: "Low",
    iconKey: "generic",
    chainId: "monad",
    markets: [{ assetSymbol: "USDC", apy: 3, tvlUsd: 1, liquidityUsd: 1 }],
  },
  {
    id: "high",
    name: "High",
    iconKey: "generic",
    chainId: "monad",
    markets: [{ assetSymbol: "USDC", apy: 6, tvlUsd: 1, liquidityUsd: 1 }],
  },
];

test("findBestMarket picks the highest apy venue for an asset", () => {
  assert.equal(findBestMarket(VENUES, "USDC")?.venue.id, "high");
  assert.equal(findBestMarket(VENUES, "WBTC"), undefined);
});

test("equalWeights splits evenly and handles empty input", () => {
  assert.deepEqual(equalWeights(4), [0.25, 0.25, 0.25, 0.25]);
  assert.deepEqual(equalWeights(0), []);
});

test("blendedApy weights each apy", () => {
  const apy = blendedApy([
    { weight: 0.5, apy: 6 },
    { weight: 0.5, apy: 2 },
  ]);
  assert.equal(apy, 4);
});

test("yearlyRewardsUsd applies apy as a percentage", () => {
  assert.equal(yearlyRewardsUsd(1000, 5), 50);
});

test("areWeightsComplete requires weights summing to one", () => {
  assert.equal(areWeightsComplete(equalWeights(3)), true);
  assert.equal(areWeightsComplete([0.5, 0.4]), false);
  assert.equal(areWeightsComplete([]), false);
});

test("findMarket honors a pin to a small venue but never picks it on its own", () => {
  const [eligible, small] = VENUES;
  assert.equal(
    findMarket([eligible], "USDC", "high", VENUES)?.venue.id,
    "high",
  );
  assert.equal(
    findMarket([eligible], "USDC", undefined, VENUES)?.venue.id,
    "low",
  );
  assert.equal(findMarket([eligible], "USDC", "high")?.venue.id, "low");
  assert.equal(small.id, "high");
});
