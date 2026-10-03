import "server-only";
import { z } from "zod";
import { clientEnvSchema, clientEnvValues } from "./env.client";

const serverEnvSchema = clientEnvSchema.extend({
  PRIVY_APP_SECRET: z.string().min(1),
  DATABASE_URL: z.url(),
  MONAD_RPC_URL: z.url().optional(),
  VENUE_MIN_TVL_USD: z.coerce.number().nonnegative().default(250_000),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function serverEnv(): ServerEnv {
  return serverEnvSchema.parse({
    ...clientEnvValues,
    PRIVY_APP_SECRET: process.env.PRIVY_APP_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    MONAD_RPC_URL: process.env.MONAD_RPC_URL || undefined,
    VENUE_MIN_TVL_USD: process.env.VENUE_MIN_TVL_USD || undefined,
  });
}
