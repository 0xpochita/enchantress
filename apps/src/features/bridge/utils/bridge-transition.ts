export type SwapStatus =
  | "KNOWN_DEPOSIT_TX"
  | "PENDING_DEPOSIT"
  | "INCOMPLETE_DEPOSIT"
  | "PROCESSING"
  | "SUCCESS"
  | "REFUNDED"
  | "FAILED";

export type BridgeTransition =
  | { kind: "wait" }
  | { kind: "landed" }
  | { kind: "refunded"; message: string }
  | { kind: "failed"; message: string };

interface TransitionInput {
  status: SwapStatus;
  hasOriginTx: boolean;
  deadline: Date | null;
  now: Date;
  refundReason?: string | null;
}

export function bridgeTransition(input: TransitionInput): BridgeTransition {
  if (input.status === "SUCCESS") return { kind: "landed" };
  if (input.status === "REFUNDED")
    return {
      kind: "refunded",
      message: input.refundReason
        ? `Aurora refunded the deposit: ${input.refundReason}.`
        : "Aurora refunded the deposit to your origin wallet.",
    };
  if (input.status === "FAILED")
    return {
      kind: "failed",
      message:
        "The cross chain transfer failed. Contact support with your transaction hash.",
    };
  const expired = input.deadline !== null && input.now > input.deadline;
  if (input.status === "PENDING_DEPOSIT" && !input.hasOriginTx && expired)
    return {
      kind: "failed",
      message:
        "The quote expired before the transfer was sent. Start again to get a new quote.",
    };
  return { kind: "wait" };
}
