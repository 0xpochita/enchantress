import assert from "node:assert/strict";
import { test } from "node:test";
import { buildBridgeCatalog, tokenIconKey } from "./catalog.ts";

const chains = [
  { id: "monad", name: "Monad", iconKey: "monad", auroraCode: "monad" },
  { id: "base", name: "Base", iconKey: "base", auroraCode: "base" },
];

test("buildBridgeCatalog keeps only tokens on supported chains", () => {
  const catalog = buildBridgeCatalog(chains, [
    { assetId: "a", blockchain: "base", symbol: "USDC", price: 1, decimals: 6 },
    { assetId: "b", blockchain: "sol", symbol: "USDC", price: 1, decimals: 6 },
    {
      assetId: "c",
      blockchain: "monad",
      symbol: "MON",
      price: 0.03,
      decimals: 18,
    },
  ]);
  assert.deepEqual(
    catalog.tokens.map((t) => [t.id, t.chainId, t.iconKey, t.priceUsd]),
    [
      ["a", "base", "usdc", 1],
      ["c", "monad", "monad", 0.03],
    ],
  );
  assert.deepEqual(catalog.popularTokenIds, ["a"]);
  assert.deepEqual(
    catalog.chains.map((c) => c.id),
    ["monad", "base"],
  );
});

test("buildBridgeCatalog lists well known tokens first", () => {
  const catalog = buildBridgeCatalog(chains, [
    {
      assetId: "x",
      blockchain: "base",
      symbol: "SSC1_PIT",
      price: 1,
      decimals: 18,
    },
    {
      assetId: "k",
      blockchain: "base",
      symbol: "KAITO",
      price: 1,
      decimals: 18,
    },
    { assetId: "e", blockchain: "base", symbol: "ETH", price: 1, decimals: 18 },
    { assetId: "u", blockchain: "base", symbol: "USDC", price: 1, decimals: 6 },
  ]);
  assert.deepEqual(
    catalog.tokens.map((t) => t.symbol),
    ["USDC", "ETH", "KAITO", "SSC1_PIT"],
  );
});

test("tokenIconKey falls back to the generic icon", () => {
  assert.equal(tokenIconKey("usdt0"), "usdt");
  assert.equal(tokenIconKey("sparkUSDC"), "usdc");
  assert.equal(tokenIconKey("XYZ"), "generic");
});
