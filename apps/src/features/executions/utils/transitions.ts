import type { ExecutionStatus } from "../types.ts";

export const EXECUTION_TRANSITIONS: Record<
  ExecutionStatus,
  readonly ExecutionStatus[]
> = {
  bridging: ["executing", "refunded", "failed", "cancelled"],
  executing: ["succeeded", "failed"],
  succeeded: [],
  failed: ["executing"],
  refunded: [],
  cancelled: [],
};

const RESUMABLE_KINDS = new Set(["deposit", "withdraw"]);
const LANDED_AURORA_STATUS = "SUCCESS";

export interface ResumeCandidate {
  kind: string;
  status: string;
  originChain: string | null;
  auroraStatus: string | null;
}

export function canTransition(
  from: ExecutionStatus,
  to: ExecutionStatus,
): boolean {
  return EXECUTION_TRANSITIONS[from].includes(to);
}

export function statusesLeadingTo(to: ExecutionStatus): ExecutionStatus[] {
  return (Object.keys(EXECUTION_TRANSITIONS) as ExecutionStatus[]).filter(
    (from) => canTransition(from, to),
  );
}

export function isResumable(
  execution: ResumeCandidate,
  steps: readonly { status: string }[],
): boolean {
  const hasLanded =
    execution.originChain === null ||
    execution.auroraStatus === LANDED_AURORA_STATUS;
  return (
    execution.status === "failed" &&
    RESUMABLE_KINDS.has(execution.kind) &&
    hasLanded &&
    steps.some((step) => step.status !== "confirmed")
  );
}
