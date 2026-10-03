import assert from "node:assert/strict";
import { test } from "node:test";
import { createIndexBodySchema } from "./types.ts";

const VALID = {
  name: "  Stable Duo ",
  allocations: [
    { assetSymbol: "USDC", weightBps: 6000 },
    { assetSymbol: "USDT0", weightBps: 4000 },
  ],
};

function firstError(body: unknown): string | undefined {
  const parsed = createIndexBodySchema.safeParse(body);
  return parsed.success ? undefined : parsed.error.issues[0]?.message;
}

test("accepts a valid recipe and trims the name", () => {
  const parsed = createIndexBodySchema.parse(VALID);
  assert.equal(parsed.name, "Stable Duo");
});

test("rejects names outside 3 to 40 characters", () => {
  const message = "Use 3 to 40 characters for the name.";
  assert.equal(firstError({ ...VALID, name: "ab " }), message);
  assert.equal(firstError({ ...VALID, name: "x".repeat(41) }), message);
});

test("rejects weights that do not sum to exactly 10000 bps", () => {
  const allocations = [
    { assetSymbol: "USDC", weightBps: 6000 },
    { assetSymbol: "USDT0", weightBps: 3999 },
  ];
  assert.equal(
    firstError({ ...VALID, allocations }),
    "Weights must add up to 100%.",
  );
});

test("rejects fractional, zero and oversized weights", () => {
  const withWeight = (weightBps: number) => ({
    ...VALID,
    allocations: [{ assetSymbol: "USDC", weightBps }],
  });
  assert.equal(
    firstError(withWeight(9999.5)),
    "Weights must be whole basis points.",
  );
  assert.equal(
    firstError(withWeight(0)),
    "Every asset needs a weight above zero.",
  );
  assert.equal(firstError(withWeight(10_001)), "A weight cannot exceed 100%.");
});

test("rejects unknown assets, duplicates and too many slices", () => {
  assert.equal(
    firstError({
      ...VALID,
      allocations: [{ assetSymbol: "DAI", weightBps: 10_000 }],
    }),
    "Pick assets from the Monad list.",
  );
  assert.equal(
    firstError({
      ...VALID,
      allocations: [
        { assetSymbol: "USDC", weightBps: 5000 },
        { assetSymbol: "USDC", weightBps: 5000 },
      ],
    }),
    "Each asset can appear only once.",
  );
  const seven = ["USDC", "USDT0", "AUSD", "WETH", "WMON", "cbBTC", "USDC"];
  assert.equal(
    firstError({
      ...VALID,
      allocations: seven.map((assetSymbol) => ({ assetSymbol, weightBps: 1 })),
    }),
    "Pick at most 6 assets.",
  );
  assert.equal(
    firstError({ ...VALID, allocations: [] }),
    "Pick at least one asset.",
  );
});
