import assert from "node:assert/strict";
import { test } from "node:test";
import { canTransition, statusesLeadingTo } from "./transitions.ts";

test("a bridging deposit can land, refund, fail or be cancelled", () => {
  for (const to of ["executing", "refunded", "failed", "cancelled"] as const)
    assert.equal(canTransition("bridging", to), true);
  assert.equal(canTransition("bridging", "succeeded"), false);
});

test("an executing deposit or withdraw only succeeds or fails", () => {
  assert.equal(canTransition("executing", "succeeded"), true);
  assert.equal(canTransition("executing", "failed"), true);
  assert.equal(canTransition("executing", "cancelled"), false);
  assert.equal(canTransition("executing", "refunded"), false);
  assert.equal(canTransition("executing", "bridging"), false);
});

test("terminal statuses never move again", () => {
  for (const from of ["succeeded", "failed", "refunded", "cancelled"] as const)
    for (const to of ["bridging", "executing", "succeeded", "failed"] as const)
      assert.equal(canTransition(from, to), false);
});

test("statusesLeadingTo lists the legal sources of a status", () => {
  assert.deepEqual(statusesLeadingTo("failed"), ["bridging", "executing"]);
  assert.deepEqual(statusesLeadingTo("cancelled"), ["bridging"]);
  assert.deepEqual(statusesLeadingTo("bridging"), []);
});
