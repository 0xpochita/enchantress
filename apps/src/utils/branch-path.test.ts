import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type BranchGeometry,
  branchPath,
  reachLength,
  rowCenter,
  trunkPath,
} from "./branch-path.ts";

const G: BranchGeometry = {
  rowHeight: 40,
  indent: 40,
  trunk: 14,
  radius: 10,
  pad: 6,
};

test("rowCenter steps one row height per row", () => {
  assert.equal(rowCenter(G, 0), 26);
  assert.equal(rowCenter(G, 2), 106);
});

test("trunkPath stops where the last branch curves away", () => {
  assert.equal(trunkPath(G, 2), "M 14 0 V 56");
});

test("branchPath curves from the trunk to the row", () => {
  assert.equal(branchPath(G, 0), "M 14 16 A 10 10 0 0 0 24 26 H 32");
});

test("reachLength adds the drop, the quarter arc and the run", () => {
  const expected = 16 + (Math.PI * 10) / 2 + 8;
  assert.ok(Math.abs(reachLength(G, 0) - expected) < 1e-9);
});
