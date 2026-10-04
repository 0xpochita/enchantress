import { z } from "zod";
import {
  INDEX_NAME_MAX_LENGTH,
  INDEX_NAME_MIN_LENGTH,
  MAX_INDEX_ASSETS,
} from "../../utils/draft.ts";
import { isOfferedForNewIndex } from "../chain/config/tokens.ts";

export const TOTAL_WEIGHT_BPS = 10_000;

const nameMessage = `Use ${INDEX_NAME_MIN_LENGTH} to ${INDEX_NAME_MAX_LENGTH} characters for the name.`;

const allocationSchema = z.object({
  assetSymbol: z.string().refine(isOfferedForNewIndex, {
    message: "Pick assets from the Monad list.",
  }),
  weightBps: z
    .number()
    .int("Weights must be whole basis points.")
    .min(1, "Every asset needs a weight above zero.")
    .max(TOTAL_WEIGHT_BPS, "A weight cannot exceed 100%."),
});

type AllocationBody = z.infer<typeof allocationSchema>;

function hasUniqueAssets(allocations: AllocationBody[]): boolean {
  return (
    new Set(allocations.map((a) => a.assetSymbol)).size === allocations.length
  );
}

function sumsToTotal(allocations: AllocationBody[]): boolean {
  const total = allocations.reduce((sum, a) => sum + a.weightBps, 0);
  return total === TOTAL_WEIGHT_BPS;
}

export const createIndexBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(INDEX_NAME_MIN_LENGTH, nameMessage)
    .max(INDEX_NAME_MAX_LENGTH, nameMessage),
  allocations: z
    .array(allocationSchema)
    .min(1, "Pick at least one asset.")
    .max(MAX_INDEX_ASSETS, `Pick at most ${MAX_INDEX_ASSETS} assets.`)
    .refine(hasUniqueAssets, { message: "Each asset can appear only once." })
    .refine(sumsToTotal, { message: "Weights must add up to 100%." }),
});

export type CreateIndexBody = z.infer<typeof createIndexBodySchema>;

export const createIndexResponseSchema = z.object({ id: z.string() });
