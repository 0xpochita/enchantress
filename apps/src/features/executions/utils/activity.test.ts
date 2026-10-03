import assert from "node:assert/strict";
import { test } from "node:test";
import { indexActivitySchema } from "../types.ts";
import { baseToAmount, toActivityRow } from "./activity.ts";

const entry = {
  id: "8f9c2c55-7a43-4a3e-9b7e-6f1f4f3c2a10",
  direction: "out",
  venueId: "aave-v3",
  assetSymbol: "USDC",
  amountBase: "2500000",
  valueUsd: "2.50",
  txHash: "0xabc",
  account: "0x0000000000000000000000000000000000000001",
  originChain: "base",
  at: new Date("2026-10-03T10:00:00Z"),
};

test("baseToAmount applies token decimals", () => {
  assert.equal(baseToAmount("USDC", 1_500_000n), 1.5);
  assert.equal(baseToAmount("WETH", 10n ** 17n), 0.1);
});

test("toActivityRow survives a JSON round trip through the response schema", () => {
  const body = JSON.parse(JSON.stringify({ rows: [toActivityRow(entry)] }));
  const parsed = indexActivitySchema.parse(body);
  assert.deepEqual(parsed.rows[0], {
    id: entry.id,
    direction: "out",
    venueId: "aave-v3",
    assetSymbol: "USDC",
    amount: 2.5,
    valueUsd: 2.5,
    account: entry.account,
    txHash: "0xabc",
    viaAurora: true,
    at: "2026-10-03T10:00:00.000Z",
  });
});

test("indexActivitySchema rejects unknown directions and bad dates", () => {
  const row = toActivityRow(entry);
  assert.throws(() =>
    indexActivitySchema.parse({ rows: [{ ...row, direction: "sideways" }] }),
  );
  assert.throws(() =>
    indexActivitySchema.parse({ rows: [{ ...row, at: "yesterday" }] }),
  );
});
