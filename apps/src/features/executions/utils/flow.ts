import type { FlowStatus } from "../../../types/flow.ts";
import type { ExecutionStatus } from "../types.ts";

export type FlowPhase =
  | "idle"
  | "confirming"
  | "starting"
  | "tracking"
  | "done";

export interface FlowState {
  phase: FlowPhase;
  attempt: number;
  executionId: string | null;
  error?: string;
}

export type FlowEvent =
  | { type: "review" }
  | { type: "start" }
  | { type: "started"; attempt: number; executionId: string | null }
  | { type: "failed"; attempt: number; error: string }
  | { type: "reset" };

export interface TrackedExecution {
  status: ExecutionStatus;
  errorMessage: string | null;
}

export const INITIAL_FLOW: FlowState = {
  phase: "idle",
  attempt: 0,
  executionId: null,
};

const TERMINAL_FAILURES: Partial<Record<ExecutionStatus, string>> = {
  refunded: "The transfer was refunded.",
  cancelled: "The deposit was cancelled.",
};

function settle(state: FlowState, event: FlowEvent): FlowState {
  if (event.type === "started")
    return {
      ...state,
      phase: event.executionId ? "tracking" : "done",
      executionId: event.executionId,
    };
  if (event.type === "failed") return { ...state, error: event.error };
  return state;
}

export function flowReducer(state: FlowState, event: FlowEvent): FlowState {
  switch (event.type) {
    case "review":
      return { ...INITIAL_FLOW, phase: "confirming", attempt: state.attempt };
    case "start":
      return {
        phase: "starting",
        attempt: state.attempt + 1,
        executionId: null,
      };
    case "reset":
      return { ...INITIAL_FLOW, attempt: state.attempt + 1 };
    default: {
      const isCurrent =
        state.phase === "starting" && event.attempt === state.attempt;
      return isCurrent ? settle(state, event) : state;
    }
  }
}

export function isTerminal(status: ExecutionStatus): boolean {
  return status !== "bridging" && status !== "executing";
}

export function shouldPoll(status: ExecutionStatus | undefined): boolean {
  return status === undefined || !isTerminal(status);
}

export function flowStatus(
  state: FlowState,
  execution?: TrackedExecution,
): FlowStatus {
  if (state.phase === "idle" || state.phase === "confirming")
    return state.phase;
  if (state.error) return "failed";
  if (state.phase === "done") return "success";
  if (state.phase === "starting" || !execution) return "pending";
  if (execution.status === "succeeded") return "success";
  return isTerminal(execution.status) ? "failed" : "pending";
}

export function flowError(
  state: FlowState,
  execution?: TrackedExecution,
): string | undefined {
  if (state.error) return state.error;
  if (state.phase !== "tracking" || !execution) return undefined;
  return (
    execution.errorMessage ?? TERMINAL_FAILURES[execution.status] ?? undefined
  );
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
