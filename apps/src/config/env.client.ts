import { z } from "zod";

const optional = (value: string | undefined) => value || undefined;

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_PRIVY_APP_ID: z.string().min(1),
  NEXT_PUBLIC_PRIVY_CLIENT_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_MONAD_RPC_URL: z.url().optional(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

export const clientEnvValues = {
  NEXT_PUBLIC_PRIVY_APP_ID: optional(process.env.NEXT_PUBLIC_PRIVY_APP_ID),
  NEXT_PUBLIC_PRIVY_CLIENT_ID: optional(
    process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID,
  ),
  NEXT_PUBLIC_MONAD_RPC_URL: optional(process.env.NEXT_PUBLIC_MONAD_RPC_URL),
};

export function readClientEnv(): z.ZodSafeParseResult<ClientEnv> {
  return clientEnvSchema.safeParse(clientEnvValues);
}
