import { z } from "zod";

export const EXECUTION_STATUSES = [
  "bridging",
  "executing",
  "succeeded",
  "failed",
  "refunded",
  "cancelled",
] as const;

export const ACTIVE_STATUSES = ["bridging", "executing"] as const;

export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export class ExecutionRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ExecutionRequestError";
    this.status = status;
    this.code = code;
  }
}

export const STEP_STATUSES = [
  "pending",
  "sent",
  "confirmed",
  "failed",
] as const;

export type StepStatus = (typeof STEP_STATUSES)[number];

export const executionStepViewSchema = z.object({
  position: z.number().int(),
  kind: z.enum(["swap", "approve", "supply", "withdraw", "redeem"]),
  assetSymbol: z.string(),
  venueId: z.string(),
  status: z.enum(STEP_STATUSES),
  txHash: z.string().nullable(),
});

export const executionViewSchema = z.object({
  id: z.uuid(),
  status: z.enum(EXECUTION_STATUSES),
  indexId: z.string(),
  depositAsset: z.string(),
  depositAmountBase: z.string(),
  valueUsd: z.number(),
  originChain: z.string().nullable(),
  originTxHash: z.string().nullable(),
  auroraStatus: z.string().nullable(),
  errorMessage: z.string().nullable(),
  steps: z.array(executionStepViewSchema),
});

export type ExecutionView = z.infer<typeof executionViewSchema>;

export const createExecutionBodySchema = z.object({
  indexId: z.string().min(1),
  depositAsset: z.enum(["USDC", "USDT0"]),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,6})?$/, "Enter an amount with up to 6 decimals."),
});

export type CreateExecutionBody = z.infer<typeof createExecutionBodySchema>;

export const createWithdrawBodySchema = z.object({
  indexId: z.string().min(1),
  fraction: z
    .number()
    .gt(0, "Choose how much to withdraw.")
    .lte(1, "You cannot withdraw more than your position."),
});

export type CreateWithdrawBody = z.infer<typeof createWithdrawBodySchema>;

export const indexHoldingSchema = z.object({
  venueId: z.string(),
  assetSymbol: z.string(),
  amount: z.number(),
  valueUsd: z.number(),
});

export const indexPositionSchema = z.object({
  valueUsd: z.number(),
  holdings: z.array(indexHoldingSchema),
});

export type IndexPosition = z.infer<typeof indexPositionSchema>;

export const activityRowSchema = z.object({
  id: z.uuid(),
  direction: z.enum(["in", "out"]),
  venueId: z.string(),
  assetSymbol: z.string(),
  amount: z.number(),
  valueUsd: z.number(),
  account: z.string().nullable(),
  txHash: z.string(),
  at: z.iso.datetime({ offset: true }),
});

export const indexActivitySchema = z.object({
  rows: z.array(activityRowSchema),
});

export type ActivityRow = z.infer<typeof activityRowSchema>;
export type IndexActivity = z.infer<typeof indexActivitySchema>;
