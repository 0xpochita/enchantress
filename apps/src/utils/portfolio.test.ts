import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizePortfolio } from "./portfolio.ts";

test("summarizePortfolio weights apy by position value", () => {
  const summary = summarizePortfolio(
    [
      { valueUsd: 300, apy: 10 },
      { valueUsd: 100, apy: 2 },
    ],
    50,
  );
  assert.equal(summary.investedUsd, 400);
  assert.equal(summary.netWorthUsd, 450);
  assert.equal(summary.yearlyUsd, 32);
  assert.equal(summary.apy, 8);
});

test("summarizePortfolio handles an empty portfolio", () => {
  assert.equal(summarizePortfolio([], 0).apy, 0);
});
