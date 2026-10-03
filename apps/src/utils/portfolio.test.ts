import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizePortfolio, valueSeries } from "./portfolio.ts";

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

test("valueSeries steps up on each deposit and accrues yield", () => {
  const series = valueSeries(
    [
      { timestamp: "2026-01-01T00:00:00Z", valueUsd: 100 },
      { timestamp: "2027-01-01T00:00:00Z", valueUsd: 50 },
    ],
    10,
    "2027-01-01T00:00:00Z",
    3,
  );
  assert.equal(series.length, 3);
  assert.equal(series[0]?.valueUsd, 100);
  assert.ok(Math.abs((series[2]?.valueUsd ?? 0) - 160) < 1e-9);
});

test("valueSeries is empty without deposits", () => {
  assert.deepEqual(valueSeries([], 5, "2026-01-01T00:00:00Z", 10), []);
});
