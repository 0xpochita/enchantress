import { z } from "zod";

export const EXECUTION_STATUSES = ["executing", "succeeded", "failed"] as const;

export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export const STEP_STATUSES = [
  "pending",
  "sent",
  "confirmed",
  "failed",
] as const;

export type StepStatus = (typeof STEP_STATUSES)[number];

export const executionStepViewSchema = z.object({
  position: z.number().int(),
  kind: z.enum(["swap", "approve", "supply"]),
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
  errorMessage: z.string().nullable(),
  steps: z.array(executionStepViewSchema),
});

export type ExecutionView = z.infer<typeof executionViewSchema>;

export const createExecutionBodySchema = z.object({
  indexId: z.string().min(1),
  depositAsset: z.literal("USDC"),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,6})?$/, "Enter an amount with up to 6 decimals."),
});

export type CreateExecutionBody = z.infer<typeof createExecutionBodySchema>;
