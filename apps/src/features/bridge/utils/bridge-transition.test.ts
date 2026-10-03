import assert from "node:assert/strict";
import { test } from "node:test";
import { bridgeTransition } from "./bridge-transition.ts";

const now = new Date("2026-10-03T10:00:00Z");
const future = new Date("2026-10-03T10:10:00Z");
const past = new Date("2026-10-03T09:50:00Z");

test("bridgeTransition waits while Aurora is still processing", () => {
  for (const status of [
    "PENDING_DEPOSIT",
    "KNOWN_DEPOSIT_TX",
    "PROCESSING",
    "INCOMPLETE_DEPOSIT",
  ] as const) {
    assert.deepEqual(
      bridgeTransition({ status, hasOriginTx: true, deadline: past, now }),
      { kind: "wait" },
    );
  }
});

test("bridgeTransition lands on success and ends on refund or failure", () => {
  assert.deepEqual(
    bridgeTransition({
      status: "SUCCESS",
      hasOriginTx: true,
      deadline: future,
      now,
    }),
    { kind: "landed" },
  );
  assert.equal(
    bridgeTransition({
      status: "REFUNDED",
      hasOriginTx: true,
      deadline: future,
      now,
      refundReason: "slippage",
    }).kind,
    "refunded",
  );
  assert.equal(
    bridgeTransition({
      status: "FAILED",
      hasOriginTx: true,
      deadline: future,
      now,
    }).kind,
    "failed",
  );
});

test("bridgeTransition expires an unsent quote after its deadline only", () => {
  assert.equal(
    bridgeTransition({
      status: "PENDING_DEPOSIT",
      hasOriginTx: false,
      deadline: past,
      now,
    }).kind,
    "failed",
  );
  assert.equal(
    bridgeTransition({
      status: "PENDING_DEPOSIT",
      hasOriginTx: false,
      deadline: future,
      now,
    }).kind,
    "wait",
  );
  assert.equal(
    bridgeTransition({
      status: "PENDING_DEPOSIT",
      hasOriginTx: false,
      deadline: null,
      now,
    }).kind,
    "wait",
  );
});
