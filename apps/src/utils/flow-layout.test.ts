import assert from "node:assert/strict";
import { test } from "node:test";
import { flowBands, groupTargets, stackBoxes } from "./flow-layout.ts";

const base = { height: 400, gap: 20, nodeX: 0, hubX: 500 };

test("node heights follow weights and fill the height minus gaps", () => {
  const bands = flowBands({ ...base, weights: [50, 25, 25] });
  const heights = bands.map((b) => b.nodeHeight);
  assert.deepEqual(heights, [180, 90, 90]);
  const last = bands.at(-1);
  assert.equal((last?.nodeTop ?? 0) + (last?.nodeHeight ?? 0), 400);
});

test("bands stack contiguously into the hub waist", () => {
  const bands = flowBands({ ...base, weights: [1, 1] });
  assert.match(bands[0].path, /500,80 L500,200/);
  assert.match(bands[1].path, /500,200 L500,320/);
});

test("a single weight spans the full height", () => {
  const [only] = stackBoxes([7], 400, 20);
  assert.deepEqual(only, { top: 0, height: 400 });
});

test("grouped targets merge slices into one box per protocol", () => {
  const { boxes, segments } = groupTargets([[50, 25], [25]], 400, 20);
  assert.deepEqual(
    boxes.map((b) => b.height),
    [285, 95],
  );
  assert.deepEqual(segments[0], [
    { top: 0, height: 190 },
    { top: 190, height: 95 },
  ]);
  assert.deepEqual(segments[1], [{ top: 305, height: 95 }]);
});
