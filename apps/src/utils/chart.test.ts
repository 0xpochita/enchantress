import assert from "node:assert/strict";
import { test } from "node:test";
import { areaPath, linePath, scaleSeries } from "./chart.ts";

const BOX = { width: 100, height: 50, top: 10 };

test("scaleSeries maps zero to the bottom and the max to the top margin", () => {
  assert.deepEqual(scaleSeries([0, 5, 10], BOX), [
    { x: 0, y: 50 },
    { x: 50, y: 30 },
    { x: 100, y: 10 },
  ]);
});

test("linePath and areaPath close the shape on the baseline", () => {
  const points = scaleSeries([0, 10], BOX);
  assert.equal(linePath(points), "M0,50 L100,10");
  assert.equal(areaPath(points, 50), "M0,50 L100,10 L100,50 L0,50 Z");
});
