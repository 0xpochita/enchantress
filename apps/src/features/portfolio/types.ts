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
  viaAurora: z.boolean(),
  at: z.string(),
});

const indexIconSchema = z.object({ iconKey: z.string(), label: z.string() });

const purchaseSchema = z.object({
  id: z.string(),
  indexId: z.string(),
  indexName: z.string(),
  kind: z.enum(["deposit", "withdraw"]),
  status: z.string(),
  paidSymbol: z.string(),
  paidIconKey: z.string(),
  paidAmount: z.number().nullable(),
  valueUsd: z.number(),
  chainId: z.string(),
  txHash: z.string().nullable(),
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
  purchases: z.array(purchaseSchema),
  indexIcons: z.record(z.string(), z.array(indexIconSchema)),
  prices: z.record(z.string(), z.number()),
});

export type Portfolio = z.infer<typeof portfolioSchema>;
export type PortfolioPosition = z.infer<typeof positionSchema>;
export type PortfolioHolding = z.infer<typeof holdingSchema>;
export type PortfolioActivity = z.infer<typeof activitySchema>;
export type PortfolioPurchase = z.infer<typeof purchaseSchema>;
export type IndexIcon = z.infer<typeof indexIconSchema>;
