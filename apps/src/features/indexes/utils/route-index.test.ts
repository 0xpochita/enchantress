import assert from "node:assert/strict";
import { test } from "node:test";
import type { Index, Venue } from "../../../types/market.ts";
import {
  routeIndex,
  routeSlices,
  summarizeIndex,
  usesVenue,
  weightedAssets,
} from "./route-index.ts";

const venue = (id: string, markets: Venue["markets"]): Venue => ({
  id,
  name: id,
  iconKey: "generic",
  chainId: "monad",
  markets,
});

const market = (assetSymbol: string, apy: number) => ({
  assetSymbol,
  apy,
  tvlUsd: 1,
  liquidityUsd: 1,
});

const catalog = {
  venues: [
    venue("aave", [market("USDC", 6), market("WETH", 5)]),
    venue("neverland", [market("USDC", 2), market("WMON", 11)]),
  ],
  assets: [
    { symbol: "USDC", name: "USD Coin", iconKey: "usdc", priceUsd: 1 },
    { symbol: "WMON", name: "Wrapped Monad", iconKey: "monad", priceUsd: 0.04 },
  ],
};

const index: Index = {
  id: "mon-maxi",
  name: "MON Maxi",
  creator: "0xabc",
  createdAt: "2026-09-20T08:10:00Z",
  tvlUsd: 1000,
  positionUsd: 0,
  isCreatedByUser: false,
  allocations: [
    { assetSymbol: "WMON", weight: 0.6 },
    { assetSymbol: "USDC", weight: 0.4 },
    { assetSymbol: "DAI", weight: 0 },
  ],
  isFeatured: true,
};

test("routeIndex sends each slice to the best paying venue and skips unknown assets", () => {
  const routed = routeIndex(index, 1000, catalog);
  assert.deepEqual(
    routed.map((r) => [r.asset.symbol, r.venue.id, r.apy, r.valueUsd]),
    [
      ["WMON", "neverland", 11, 600],
      ["USDC", "aave", 6, 400],
    ],
  );
});

test("summarizeIndex blends the apy by weight and reports venue usage", () => {
  const summary = summarizeIndex(index, catalog);
  assert.ok(Math.abs(summary.apy - 9) < 1e-9);
  assert.equal(usesVenue(summary, "neverland"), true);
  assert.equal(usesVenue(summary, "morpho"), false);
});

test("routeSlices routes every allocation and keeps its weight in bps", () => {
  const routing = routeSlices(
    [
      { assetSymbol: "WMON", weightBps: 5000 },
      { assetSymbol: "USDC", weightBps: 3000 },
      { assetSymbol: "WMON", weightBps: 2000 },
    ],
    catalog,
  );
  assert.deepEqual(routing, {
    ok: true,
    slices: [
      { assetSymbol: "WMON", weightBps: 5000, venueId: "neverland" },
      { assetSymbol: "USDC", weightBps: 3000, venueId: "aave" },
      { assetSymbol: "WMON", weightBps: 2000, venueId: "neverland" },
    ],
  });
});

test("routeSlices names the asset that has no eligible venue", () => {
  const routing = routeSlices(
    [
      { assetSymbol: "WMON", weightBps: 5000 },
      { assetSymbol: "USDT0", weightBps: 3000 },
      { assetSymbol: "USDC", weightBps: 2000 },
    ],
    catalog,
  );
  assert.deepEqual(routing, { ok: false, unroutableAsset: "USDT0" });
});

test("routeSlices rejects an asset with a venue but no price", () => {
  const routing = routeSlices(
    [{ assetSymbol: "WETH", weightBps: 10_000 }],
    catalog,
  );
  assert.deepEqual(routing, { ok: false, unroutableAsset: "WETH" });
});

test("weightedAssets converts index weights to exact basis points", () => {
  const thirds: Index = {
    ...index,
    allocations: [
      { assetSymbol: "WMON", weight: 3333 / 10_000 },
      { assetSymbol: "USDC", weight: 3333 / 10_000 },
      { assetSymbol: "WETH", weight: 3334 / 10_000 },
    ],
  };
  assert.deepEqual(
    weightedAssets(thirds).map((a) => a.weightBps),
    [3333, 3333, 3334],
  );
});

test("routeIndex honors a pinned venue even when it pays less", () => {
  const pinned: Index = {
    ...index,
    allocations: [{ assetSymbol: "USDC", weight: 1, venueId: "neverland" }],
  };
  const [routed] = routeIndex(pinned, 100, catalog);
  assert.equal(routed?.venue.id, "neverland");
  assert.equal(routed?.apy, 2);
});

test("routeSlices sends a pinned slice to its venue", () => {
  const routing = routeSlices(
    [{ assetSymbol: "USDC", weightBps: 10_000, venueId: "neverland" }],
    catalog,
  );
  assert.deepEqual(routing, {
    ok: true,
    slices: [{ assetSymbol: "USDC", weightBps: 10_000, venueId: "neverland" }],
  });
});

test("routeSlices falls back to the best market when the pinned venue lacks the asset", () => {
  const routing = routeSlices(
    [
      { assetSymbol: "USDC", weightBps: 5000, venueId: "morpho" },
      { assetSymbol: "WMON", weightBps: 5000, venueId: "aave" },
    ],
    catalog,
  );
  assert.deepEqual(routing, {
    ok: true,
    slices: [
      { assetSymbol: "USDC", weightBps: 5000, venueId: "aave" },
      { assetSymbol: "WMON", weightBps: 5000, venueId: "neverland" },
    ],
  });
});

test("weightedAssets carries the pinned venue", () => {
  const pinned: Index = {
    ...index,
    allocations: [{ assetSymbol: "USDC", weight: 1, venueId: "neverland" }],
  };
  assert.deepEqual(weightedAssets(pinned), [
    { assetSymbol: "USDC", weightBps: 10_000, venueId: "neverland" },
  ]);
});
