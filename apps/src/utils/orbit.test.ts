import assert from "node:assert/strict";
import { test } from "node:test";
import { arcPosition } from "./orbit.ts";

const round = (value: number) => Math.round(value * 1000) / 1000;

test("arcPosition places the top of the arc at the horizontal center", () => {
  const point = arcPosition(0.5, 90, 0.5);
  assert.deepEqual([round(point.leftPct), round(point.topPct)], [50, 0]);
});

test("arcPosition places 0 and 180 degrees on the bottom edge", () => {
  assert.deepEqual(
    [
      round(arcPosition(0.25, 0, 0.5).leftPct),
      round(arcPosition(0.25, 0, 0.5).topPct),
    ],
    [75, 100],
  );
  assert.deepEqual(
    [
      round(arcPosition(0.25, 180, 0.5).leftPct),
      round(arcPosition(0.25, 180, 0.5).topPct),
    ],
    [25, 100],
  );
});
