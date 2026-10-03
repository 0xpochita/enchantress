import "server-only";
import { z } from "zod";
import { serverEnv } from "@/config/env.server";

const BASE_URL = "https://intents-api.aurora.dev";
const MAX_ATTEMPTS = 3;
const RETRY_FALLBACK_SECONDS = 1;

export class AuroraError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuroraError";
  }
}

export const auroraTokenSchema = z.object({
  assetId: z.string(),
  decimals: z.number().int(),
  blockchain: z.string(),
  symbol: z.string(),
  price: z.number(),
  contractAddress: z.string().nullable().optional(),
});

export type AuroraToken = z.infer<typeof auroraTokenSchema>;

const tokensResponseSchema = z.object({ tokens: z.array(auroraTokenSchema) });

export const quoteRequestSchema = z.object({
  dry: z.boolean(),
  swapType: z.literal("EXACT_INPUT"),
  depositType: z.literal("ORIGIN_CHAIN"),
  amount: z.string(),
  originAsset: z.string(),
  destinationAsset: z.string(),
  slippageTolerance: z.number().int(),
  refundTo: z.string(),
  refundType: z.literal("ORIGIN_CHAIN"),
  recipient: z.string(),
  recipientType: z.literal("DESTINATION_CHAIN"),
  deadline: z.string().optional(),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

const quoteSchema = z.object({
  timeEstimate: z.number(),
  deadline: z.string().optional(),
  depositAddress: z.string().optional(),
  depositMemo: z.string().optional(),
  amountIn: z.string(),
  amountInUsd: z.string(),
  minAmountIn: z.string().optional(),
  amountOut: z.string(),
  amountOutUsd: z.string(),
  minAmountOut: z.string(),
});

export const quoteResponseSchema = z.object({ quote: quoteSchema });

export type AuroraQuote = z.infer<typeof quoteSchema>;

export const SWAP_STATUSES = [
  "KNOWN_DEPOSIT_TX",
  "PENDING_DEPOSIT",
  "INCOMPLETE_DEPOSIT",
  "PROCESSING",
  "SUCCESS",
  "REFUNDED",
  "FAILED",
] as const;

export type SwapStatus = (typeof SWAP_STATUSES)[number];

export const statusResponseSchema = z.object({
  status: z.enum(SWAP_STATUSES),
  swapDetails: z
    .object({
      amountOut: z.string().nullable().optional(),
      refundReason: z.string().nullable().optional(),
      destinationChainTxHashes: z
        .array(z.object({ hash: z.string() }))
        .optional(),
    })
    .optional(),
});

export type StatusResponse = z.infer<typeof statusResponseSchema>;

const incidentsSchema = z.object({ status: z.string() });

function apiKey(): string {
  const key = serverEnv().AURORA_INTENTS_API_KEY;
  if (!key)
    throw new AuroraError(503, "Cross chain deposits are not configured.");
  return encodeURIComponent(key);
}

export function isAuroraConfigured(): boolean {
  return Boolean(serverEnv().AURORA_INTENTS_API_KEY);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
): Promise<Response> {
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(url, init);
    if (response.status !== 429 || attempt >= MAX_ATTEMPTS) return response;
    const retryAfter =
      Number(response.headers.get("retry-after")) || RETRY_FALLBACK_SECONDS;
    await sleep(retryAfter * 1000 + Math.random() * 500);
  }
}

async function call<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetchWithRetry(`${BASE_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
    cache: "no-store",
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = z.object({ message: z.string() }).safeParse(body);
    throw new AuroraError(
      response.status,
      message.success ? message.data.message : `Aurora ${response.status}`,
    );
  }
  return schema.parse(body);
}

export function fetchAuroraTokens(): Promise<AuroraToken[]> {
  return call(`/api/tokens/${apiKey()}`, tokensResponseSchema).then(
    (r) => r.tokens,
  );
}

export function fetchAuroraQuote(request: QuoteRequest): Promise<AuroraQuote> {
  return call(`/api/quote/${apiKey()}`, quoteResponseSchema, {
    method: "POST",
    body: JSON.stringify(request),
  }).then((r) => r.quote);
}

export function submitAuroraDeposit(
  txHash: string,
  depositAddress: string,
  memo?: string,
) {
  return call(`/api/deposit/submit/${apiKey()}`, z.object({}).passthrough(), {
    method: "POST",
    body: JSON.stringify({ txHash, depositAddress, ...(memo ? { memo } : {}) }),
  });
}

export function fetchAuroraStatus(
  depositAddress: string,
  memo?: string | null,
) {
  const query = new URLSearchParams({ depositAddress });
  if (memo) query.set("depositMemo", memo);
  return call(`/api/status/${apiKey()}?${query}`, statusResponseSchema);
}

export async function hasAuroraIncidents(): Promise<boolean> {
  const result = await call(`/api/incidents/${apiKey()}`, incidentsSchema);
  return result.status !== "operational";
}
