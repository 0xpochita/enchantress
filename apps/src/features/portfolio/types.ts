import { z } from "zod";

const holdingSchema = z.object({
  venueId: z.string(),
  venueName: z.string(),
  venueIconKey: z.string(),
  assetSymbol: z.string(),
  assetIconKey: z.string(),
  amount: z.number(),
  valueUsd: z.number(),
  apy: z.number(),
});

const positionSchema = z.object({
  indexId: z.string(),
  indexName: z.string(),
  valueUsd: z.number(),
  costUsd: z.number(),
  earnedUsd: z.number(),
  apy: z.number(),
  holdings: z.array(holdingSchema),
});

const activitySchema = z.object({
  id: z.string(),
  indexId: z.string(),
  indexName: z.string(),
  direction: z.enum(["in", "out"]),
  assetSymbol: z.string(),
  assetIconKey: z.string(),
  amount: z.number(),
  valueUsd: z.number(),
  txHash: z.string(),
  at: z.string(),
});

export const portfolioSchema = z.object({
  totals: z.object({
    valueUsd: z.number(),
    costUsd: z.number(),
    earnedUsd: z.number(),
    apy: z.number(),
    yearlyUsd: z.number(),
  }),
  positions: z.array(positionSchema),
  history: z.array(z.object({ time: z.number(), valueUsd: z.number() })),
  activity: z.array(activitySchema),
  prices: z.record(z.string(), z.number()),
});

export type Portfolio = z.infer<typeof portfolioSchema>;
export type PortfolioPosition = z.infer<typeof positionSchema>;
export type PortfolioHolding = z.infer<typeof holdingSchema>;
export type PortfolioActivity = z.infer<typeof activitySchema>;
