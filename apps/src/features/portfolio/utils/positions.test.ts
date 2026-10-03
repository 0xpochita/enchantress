import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPositions, netInvestedByIndex } from "./positions.ts";

const holding = (indexId: string, valueUsd: number, apy: number) => ({
  indexId,
  venueId: "aave-v3",
  assetSymbol: "USDC",
  amount: valueUsd,
  valueUsd,
  apy,
});

test("netInvestedByIndex subtracts withdrawals from deposits", () => {
  const invested = netInvestedByIndex([
    { indexId: "a", direction: "in", valueUsd: 100 },
    { indexId: "a", direction: "in", valueUsd: 50 },
    { indexId: "a", direction: "out", valueUsd: 30 },
    { indexId: "b", direction: "in", valueUsd: 10 },
  ]);
  assert.equal(invested.get("a"), 120);
  assert.equal(invested.get("b"), 10);
});

test("buildPositions computes earned and value weighted apy", () => {
  const positions = buildPositions(
    [holding("a", 75, 4), holding("a", 25, 8), holding("b", 200, 2)],
    new Map([
      ["a", 90],
      ["b", 200],
    ]),
  );
  assert.deepEqual(
    positions.map((p) => p.indexId),
    ["b", "a"],
  );
  const a = positions[1];
  assert.equal(a?.valueUsd, 100);
  assert.equal(a?.costUsd, 90);
  assert.equal(a?.earnedUsd, 10);
  assert.equal(a?.apy, 5);
  assert.equal(positions[0]?.earnedUsd, 0);
});

test("buildPositions returns nothing for an empty portfolio", () => {
  assert.deepEqual(buildPositions([], new Map()), []);
});
