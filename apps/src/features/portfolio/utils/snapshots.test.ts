import assert from "node:assert/strict";
import { test } from "node:test";
import { historySeries, snapshotDate, snapshotRow } from "./snapshots.ts";

const position = (indexId: string, valueUsd: number) => ({
  indexId,
  valueUsd,
  costUsd: valueUsd,
  earnedUsd: 0,
  apy: 0,
  holdings: [],
});

test("snapshotDate is the UTC calendar day", () => {
  assert.equal(snapshotDate(new Date("2026-10-03T23:59:59Z")), "2026-10-03");
});

test("snapshotRow has the upsert shape keyed by user and day", () => {
  const row = snapshotRow("user-1", "2026-10-03", [
    position("a", 10.004),
    position("b", 2.5),
  ]);
  assert.deepEqual(row, {
    userId: "user-1",
    takenAt: "2026-10-03",
    totalValueUsd: "12.50",
    byIndex: { a: 10, b: 2.5 },
  });
});

test("historySeries orders past snapshots and ends with the live point", () => {
  const live = { time: Date.parse("2026-10-03T12:00:00Z"), valueUsd: 30 };
  const series = historySeries(
    [
      { takenAt: "2026-10-03", totalValueUsd: 29 },
      { takenAt: "2026-10-02", totalValueUsd: 20 },
      { takenAt: "2026-10-01", totalValueUsd: 10 },
    ],
    [{ at: "2026-09-01T00:00:00Z", direction: "in", valueUsd: 5 }],
    live,
  );
  assert.deepEqual(
    series.map((p) => p.valueUsd),
    [10, 20, 30],
  );
});

test("historySeries falls back to net deposits before the first snapshot", () => {
  const live = { time: Date.parse("2026-10-03T12:00:00Z"), valueUsd: 31 };
  const series = historySeries(
    [{ takenAt: "2026-10-03", totalValueUsd: 30 }],
    [
      { at: "2026-10-02T00:00:00Z", direction: "out", valueUsd: 10 },
      { at: "2026-10-01T00:00:00Z", direction: "in", valueUsd: 40 },
    ],
    live,
  );
  assert.deepEqual(
    series.map((p) => p.valueUsd),
    [40, 30, 31],
  );
});
