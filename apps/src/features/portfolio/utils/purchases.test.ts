import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ExecutionRecord,
  type PurchaseLookups,
  toPurchase,
} from "./purchases.ts";

const lookups: PurchaseLookups = {
  indexName: (id) => (id === "mon-maxi" ? "MON Maxi" : id),
  monadToken: (symbol) =>
    symbol === "USDT0" ? { symbol, decimals: 6, iconKey: "usdt0" } : undefined,
  originToken: (assetId) =>
    assetId === "base-usdc"
      ? { symbol: "USDC", decimals: 6, iconKey: "usdc" }
      : undefined,
};

function record(overrides: Partial<ExecutionRecord>): ExecutionRecord {
  return {
    id: "e1",
    indexId: "mon-maxi",
    kind: "deposit",
    status: "succeeded",
    depositAsset: "USDT0",
    depositAmountBase: "100000",
    valueUsd: "0.10",
    originChain: null,
    originAssetId: null,
    originAmountBase: null,
    originTxHash: null,
    firstTxHash: "0xfirst",
    createdAt: new Date("2026-10-03T08:36:38Z"),
    ...overrides,
  };
}

test("a direct Monad deposit shows the deposit token and first step tx", () => {
  const p = toPurchase(record({}), lookups);
  assert.equal(p.indexName, "MON Maxi");
  assert.equal(p.paidSymbol, "USDT0");
  assert.equal(p.paidAmount, 0.1);
  assert.equal(p.chainId, "monad");
  assert.equal(p.txHash, "0xfirst");
});

test("a bridged deposit shows the origin token, chain and origin tx", () => {
  const p = toPurchase(
    record({
      depositAsset: "USDC",
      originChain: "base",
      originAssetId: "base-usdc",
      originAmountBase: "10000000",
      originTxHash: "0xorigin",
    }),
    lookups,
  );
  assert.deepEqual(
    [p.paidSymbol, p.paidAmount, p.chainId, p.txHash],
    ["USDC", 10, "base", "0xorigin"],
  );
});

test("a withdrawal has no single paid amount", () => {
  const p = toPurchase(
    record({
      kind: "withdraw",
      depositAsset: "WMON,USDC",
      depositAmountBase: "0",
    }),
    lookups,
  );
  assert.equal(p.kind, "withdraw");
  assert.equal(p.paidAmount, null);
  assert.equal(p.paidSymbol, "WMON,USDC");
});
