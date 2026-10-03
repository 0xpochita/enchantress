import "server-only";
import { z } from "zod";
import { clientEnvSchema, clientEnvValues } from "./env.client";

const serverEnvSchema = clientEnvSchema.extend({
  PRIVY_APP_SECRET: z.string().min(1),
  DATABASE_URL: z.url(),
  MONAD_RPC_URL: z.url().optional(),
  VENUE_MIN_TVL_USD: z.coerce.number().nonnegative().default(250_000),
  PRIVY_AUTHORIZATION_PRIVATE_KEY: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
  BETA_MAX_DEPOSIT_USD_PER_DAY: z.coerce.number().nonnegative().default(100),
  BETA_ALLOWLIST_EMAILS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  SWAP_SLIPPAGE_BPS: z.coerce.number().int().min(1).max(1000).default(50),
  SWAP_MAX_ORACLE_DEVIATION_BPS: z.coerce.number().int().min(1).default(500),
  AURORA_INTENTS_API_KEY: z.string().min(1).optional(),
  ETHEREUM_RPC_URL: z.url().optional(),
  BASE_RPC_URL: z.url().optional(),
  ARBITRUM_RPC_URL: z.url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function serverEnv(): ServerEnv {
  return serverEnvSchema.parse({
    ...clientEnvValues,
    PRIVY_APP_SECRET: process.env.PRIVY_APP_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    MONAD_RPC_URL: process.env.MONAD_RPC_URL || undefined,
    VENUE_MIN_TVL_USD: process.env.VENUE_MIN_TVL_USD || undefined,
    PRIVY_AUTHORIZATION_PRIVATE_KEY:
      process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY || undefined,
    CRON_SECRET: process.env.CRON_SECRET || undefined,
    BETA_MAX_DEPOSIT_USD_PER_DAY:
      process.env.BETA_MAX_DEPOSIT_USD_PER_DAY || undefined,
    BETA_ALLOWLIST_EMAILS: process.env.BETA_ALLOWLIST_EMAILS || undefined,
    SWAP_SLIPPAGE_BPS: process.env.SWAP_SLIPPAGE_BPS || undefined,
    SWAP_MAX_ORACLE_DEVIATION_BPS:
      process.env.SWAP_MAX_ORACLE_DEVIATION_BPS || undefined,
    AURORA_INTENTS_API_KEY: process.env.AURORA_INTENTS_API_KEY || undefined,
    ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL || undefined,
    BASE_RPC_URL: process.env.BASE_RPC_URL || undefined,
    ARBITRUM_RPC_URL: process.env.ARBITRUM_RPC_URL || undefined,
  });
}
