import type { ExecutionStatus } from "../types.ts";

export const EXECUTION_TRANSITIONS: Record<
  ExecutionStatus,
  readonly ExecutionStatus[]
> = {
  bridging: ["executing", "refunded", "failed", "cancelled"],
  executing: ["succeeded", "failed"],
  succeeded: [],
  failed: [],
  refunded: [],
  cancelled: [],
};

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
