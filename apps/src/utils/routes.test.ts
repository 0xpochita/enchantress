import assert from "node:assert/strict";
import { test } from "node:test";
import { estimateRouteFeeUsd, rankRoutes } from "./routes.ts";

const CANDIDATES = [
  { basketId: "low", apy: 4, assetCount: 1 },
  { basketId: "high", apy: 8, assetCount: 2 },
];

test("rankRoutes orders by apy and marks the best route", () => {
  const routes = rankRoutes(CANDIDATES, 1000, true);
  assert.deepEqual(
    routes.map((r) => r.basketId),
    ["high", "low"],
  );
  assert.equal(routes[0]?.isBest, true);
  assert.equal(routes[0]?.yearlyUsd, 80);
  assert.equal(routes[1]?.deltaPct, -50);
});

test("rankRoutes handles no candidates", () => {
  assert.deepEqual(rankRoutes([], 1000, false), []);
});

test("estimateRouteFeeUsd charges more for cross-chain routes", () => {
  assert.ok(estimateRouteFeeUsd(true, 2) > estimateRouteFeeUsd(false, 2));
});
