import assert from "node:assert/strict";
import { test } from "node:test";
import { planDeposit, sliceAmounts } from "./plan.ts";

test("sliceAmounts floors each slice and gives the dust to the last one", () => {
  assert.deepEqual(sliceAmounts(100n, [3333, 3333, 3334]), [33n, 33n, 34n]);
  assert.deepEqual(sliceAmounts(10n, [5000, 5000]), [5n, 5n]);
  assert.deepEqual(sliceAmounts(7n, [6000, 4000]), [4n, 3n]);
  assert.deepEqual(sliceAmounts(5n, []), []);
});

test("planDeposit approves and supplies the deposit asset directly", () => {
  const steps = planDeposit({
    depositAsset: "USDC",
    depositAmountBase: 1_000_000n,
    slices: [{ assetSymbol: "USDC", weightBps: 10_000, venueId: "aave-v3" }],
  });
  assert.deepEqual(
    steps.map((s) => [
      s.position,
      s.kind,
      s.spender,
      s.assetSymbol,
      s.amountBase,
    ]),
    [
      [0, "approve", "venue", "USDC", "1000000"],
      [1, "supply", null, "USDC", "1000000"],
    ],
  );
});

test("planDeposit approves the router, swaps, then chains the swap output", () => {
  const steps = planDeposit({
    depositAsset: "USDC",
    depositAmountBase: 1_000_000n,
    slices: [
      { assetSymbol: "USDC", weightBps: 5000, venueId: "aave-v3" },
      { assetSymbol: "USDT0", weightBps: 5000, venueId: "neverland" },
    ],
  });
  assert.deepEqual(
    steps.map((s) => [
      s.position,
      s.kind,
      s.spender,
      s.assetSymbol,
      s.amountBase,
      s.amountFromPosition,
    ]),
    [
      [0, "approve", "venue", "USDC", "500000", null],
      [1, "supply", null, "USDC", "500000", null],
      [2, "approve", "router", "USDC", "500000", null],
      [3, "swap", null, "USDT0", "500000", null],
      [4, "approve", "venue", "USDT0", null, 3],
      [5, "supply", null, "USDT0", null, 3],
    ],
  );
});

test("planDeposit drops slices that round down to nothing", () => {
  const steps = planDeposit({
    depositAsset: "USDC",
    depositAmountBase: 1n,
    slices: [
      { assetSymbol: "USDC", weightBps: 9000, venueId: "aave-v3" },
      { assetSymbol: "WETH", weightBps: 1000, venueId: "aave-v3" },
    ],
  });
  assert.deepEqual(
    steps.map((s) => [s.kind, s.assetSymbol]),
    [
      ["approve", "USDC"],
      ["swap", "WETH"],
      ["approve", "WETH"],
      ["supply", "WETH"],
    ],
  );
});
