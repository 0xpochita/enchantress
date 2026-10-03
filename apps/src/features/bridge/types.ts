import { z } from "zod";
import { executionViewSchema } from "@/features/executions/types";

const amountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,18})?$/, "Enter a valid amount.");

export const walletBalanceSchema = z.object({
  tokenId: z.string(),
  amount: z.number(),
});

export const balancesResponseSchema = z.object({
  balances: z.array(walletBalanceSchema),
});

export const quotePreviewBodySchema = z.object({
  originTokenId: z.string().min(1),
  amount: amountSchema,
});

export const quotePreviewSchema = z.object({
  amountOutBase: z.string(),
  amountOutUsd: z.number(),
  amountInUsd: z.number(),
  timeEstimateSeconds: z.number(),
});

export type QuotePreview = z.infer<typeof quotePreviewSchema>;

export const createBridgeDepositBodySchema = z.object({
  indexId: z.string().min(1),
  originTokenId: z.string().min(1),
  amount: amountSchema,
});

export type CreateBridgeDepositBody = z.infer<
  typeof createBridgeDepositBodySchema
>;

export const transferInstructionSchema = z.object({
  chainId: z.number().int(),
  tokenAddress: z.string().nullable(),
  depositAddress: z.string(),
  amountInBase: z.string(),
  memo: z.string().nullable(),
});

export type TransferInstruction = z.infer<typeof transferInstructionSchema>;

export const bridgeDepositResponseSchema = z.object({
  execution: executionViewSchema,
  transfer: transferInstructionSchema.nullable(),
});

export type BridgeDepositResponse = z.infer<typeof bridgeDepositResponseSchema>;

export const submitBridgeBodySchema = z.object({
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/, "Invalid transaction hash."),
});
