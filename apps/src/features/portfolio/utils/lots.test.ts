import assert from "node:assert/strict";
import { test } from "node:test";
import { RAY } from "../../vaults/utils/aave-math.ts";
import {
  aggregateLots,
  marketKey,
  sumByIndex,
  unitsToAssets,
  valueHoldings,
  valueUnits,
} from "./lots.ts";

const lot = (indexId: string, venueId: string, units: string) => ({
  indexId,
  venueId,
  assetSymbol: "USDC",
  units,
});

test("aggregateLots sums units per index, venue and asset", () => {
  const holdings = aggregateLots([
    lot("a", "aave-v3", "100"),
    lot("a", "aave-v3", "50"),
    lot("a", "neverland", "7"),
    lot("b", "aave-v3", "1"),
  ]);
  assert.deepEqual(
    holdings.map((h) => [h.indexId, h.venueId, h.units]),
    [
      ["a", "aave-v3", 150n],
      ["a", "neverland", 7n],
      ["b", "aave-v3", 1n],
    ],
  );
});

test("aggregateLots drops holdings that net to zero", () => {
  const holdings = aggregateLots([
    lot("a", "aave-v3", "100"),
    lot("a", "aave-v3", "-100"),
  ]);
  assert.deepEqual(holdings, []);
});

test("unitsToAssets applies a ray rate with half up rounding", () => {
  assert.equal(unitsToAssets(1_000_000n, RAY), 1_000_000n);
  assert.equal(unitsToAssets(3n, (RAY * 3n) / 2n), 5n);
  assert.equal(unitsToAssets(1_000_000n, (RAY * 105n) / 100n), 1_050_000n);
});

test("valueHoldings prices assets and flags markets it cannot price", () => {
  const quotes = new Map([
    [
      marketKey("aave-v3", "USDC"),
      { rateRay: (RAY * 11n) / 10n, decimals: 6, priceUsd: 1, apy: 4 },
    ],
  ]);
  const valued = valueHoldings(
    [
      {
        indexId: "a",
        venueId: "aave-v3",
        assetSymbol: "USDC",
        units: 10n ** 7n,
      },
      { indexId: "a", venueId: "morpho", assetSymbol: "USDC", units: 1n },
    ],
    quotes,
  );
  assert.deepEqual(
    valued.map((h) => [h.amount, h.valueUsd, h.apy, h.priced]),
    [
      [11, 11, 4, true],
      [0, 0, 0, false],
    ],
  );
});

test("valueUnits counts an unpriced market at zero value but keeps the amount", () => {
  const quote = { rateRay: RAY, decimals: 6, priceUsd: undefined, apy: 3 };
  assert.deepEqual(valueUnits(2_500_000n, quote), {
    assets: 2_500_000n,
    amount: 2.5,
    valueUsd: 0,
    apy: 3,
    priced: false,
  });
});

test("sumByIndex totals value per index", () => {
  const holding = (indexId: string, valueUsd: number) => ({
    indexId,
    venueId: "aave-v3",
    assetSymbol: "USDC",
    amount: valueUsd,
    valueUsd,
    apy: 0,
    priced: true,
  });
  assert.deepEqual(
    sumByIndex([holding("a", 1), holding("a", 2), holding("b", 5)]),
    { a: 3, b: 5 },
  );
});
