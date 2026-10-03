import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type FlowEvent,
  type FlowState,
  flowError,
  flowReducer,
  flowStatus,
  INITIAL_FLOW,
  shouldPoll,
} from "./flow.ts";

function run(...events: FlowEvent[]): FlowState {
  return events.reduce(flowReducer, INITIAL_FLOW);
}

const tracking = run(
  { type: "review" },
  { type: "start" },
  { type: "started", attempt: 1, executionId: "exec-1" },
);

test("review then start moves through confirming to pending", () => {
  assert.equal(flowStatus(run({ type: "review" })), "confirming");
  assert.equal(
    flowStatus(run({ type: "review" }, { type: "start" })),
    "pending",
  );
  assert.equal(tracking.phase, "tracking");
  assert.equal(tracking.executionId, "exec-1");
});

test("bridging and executing stay pending and keep polling", () => {
  for (const status of ["bridging", "executing"] as const) {
    assert.equal(
      flowStatus(tracking, { status, errorMessage: null }),
      "pending",
    );
    assert.equal(shouldPoll(status), true);
  }
  assert.equal(shouldPoll(undefined), true);
});

test("succeeded ends the flow with success", () => {
  const execution = { status: "succeeded" as const, errorMessage: null };
  assert.equal(flowStatus(tracking, execution), "success");
  assert.equal(shouldPoll("succeeded"), false);
  assert.equal(flowError(tracking, execution), undefined);
});

test("failed ends the flow with the server reason", () => {
  const execution = {
    status: "failed" as const,
    errorMessage: "Swap reverted",
  };
  assert.equal(flowStatus(tracking, execution), "failed");
  assert.equal(shouldPoll("failed"), false);
  assert.equal(flowError(tracking, execution), "Swap reverted");
});

test("refunded and cancelled end the flow as failed", () => {
  for (const status of ["refunded", "cancelled"] as const) {
    assert.equal(
      flowStatus(tracking, { status, errorMessage: null }),
      "failed",
    );
    assert.equal(shouldPoll(status), false);
  }
  const refunded = { status: "refunded" as const, errorMessage: "Expired" };
  assert.equal(flowError(tracking, refunded), "Expired");
  const cancelled = { status: "cancelled" as const, errorMessage: null };
  assert.equal(flowError(tracking, cancelled), "The deposit was cancelled.");
});

test("a start error fails the flow", () => {
  const state = run(
    { type: "review" },
    { type: "start" },
    { type: "failed", attempt: 1, error: "Rejected" },
  );
  assert.equal(flowStatus(state), "failed");
  assert.equal(flowError(state), "Rejected");
});

test("retry after failure clears the error and ignores the old attempt", () => {
  const failed = run(
    { type: "start" },
    { type: "failed", attempt: 1, error: "Rejected" },
  );
  const retried = run(
    { type: "start" },
    { type: "failed", attempt: 1, error: "Rejected" },
    { type: "review" },
    { type: "start" },
    { type: "started", attempt: 1, executionId: "stale" },
  );
  assert.equal(flowStatus(failed), "failed");
  assert.equal(flowStatus(retried), "pending");
  assert.equal(retried.error, undefined);
  assert.equal(retried.executionId, null);
  const settled = flowReducer(retried, {
    type: "started",
    attempt: 2,
    executionId: "exec-2",
  });
  assert.equal(settled.executionId, "exec-2");
});

test("a start that returns no execution succeeds without tracking", () => {
  const state = run(
    { type: "start" },
    { type: "started", attempt: 1, executionId: null },
  );
  assert.equal(state.phase, "done");
  assert.equal(flowStatus(state), "success");
});

test("reset discards a start that resolves afterwards", () => {
  const state = run(
    { type: "start" },
    { type: "reset" },
    { type: "started", attempt: 1, executionId: "late" },
  );
  assert.equal(flowStatus(state), "idle");
  assert.equal(state.executionId, null);
});
