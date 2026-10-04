import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canTransition,
  isResumable,
  type ResumeCandidate,
  statusesLeadingTo,
} from "./transitions.ts";

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
  for (const from of ["succeeded", "refunded", "cancelled"] as const)
    for (const to of ["bridging", "executing", "succeeded", "failed"] as const)
      assert.equal(canTransition(from, to), false);
});

test("a failed execution can only be resumed back to executing", () => {
  assert.equal(canTransition("failed", "executing"), true);
  for (const to of ["bridging", "succeeded", "refunded", "cancelled"] as const)
    assert.equal(canTransition("failed", to), false);
});

test("statusesLeadingTo lists the legal sources of a status", () => {
  assert.deepEqual(statusesLeadingTo("failed"), ["bridging", "executing"]);
  assert.deepEqual(statusesLeadingTo("cancelled"), ["bridging"]);
  assert.deepEqual(statusesLeadingTo("bridging"), []);
  assert.deepEqual(statusesLeadingTo("executing"), ["bridging", "failed"]);
});

const FAILED_DEPOSIT: ResumeCandidate = {
  kind: "deposit",
  status: "failed",
  originChain: null,
  auroraStatus: null,
};
const PARTIAL = [{ status: "confirmed" }, { status: "failed" }];

test("a failed deposit or withdraw with unconfirmed steps is resumable", () => {
  assert.equal(isResumable(FAILED_DEPOSIT, PARTIAL), true);
  assert.equal(
    isResumable({ ...FAILED_DEPOSIT, kind: "withdraw" }, PARTIAL),
    true,
  );
});

test("a bridged deposit is resumable only after its funds landed", () => {
  const bridged = { ...FAILED_DEPOSIT, originChain: "base" };
  assert.equal(
    isResumable({ ...bridged, auroraStatus: "SUCCESS" }, PARTIAL),
    true,
  );
  assert.equal(
    isResumable({ ...bridged, auroraStatus: "FAILED" }, PARTIAL),
    false,
  );
  assert.equal(isResumable({ ...bridged, auroraStatus: null }, []), false);
});

test("other statuses, kinds and fully confirmed executions are not resumable", () => {
  for (const status of ["executing", "succeeded", "refunded", "cancelled"])
    assert.equal(isResumable({ ...FAILED_DEPOSIT, status }, PARTIAL), false);
  assert.equal(
    isResumable({ ...FAILED_DEPOSIT, kind: "bridge" }, PARTIAL),
    false,
  );
  assert.equal(isResumable(FAILED_DEPOSIT, [{ status: "confirmed" }]), false);
  assert.equal(isResumable(FAILED_DEPOSIT, []), false);
});
