import { z } from "zod";

const optional = (value: string | undefined) => value || undefined;

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_PRIVY_APP_ID: z.string().min(1),
  NEXT_PUBLIC_PRIVY_CLIENT_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_MONAD_RPC_URL: z.url().optional(),
  NEXT_PUBLIC_PRIVY_SIGNER_QUORUM_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_PRIVY_VAULT_POLICY_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_SPONSORED_CHAIN_IDS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((id) => Number(id.trim()))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

export const clientEnvValues = {
  NEXT_PUBLIC_PRIVY_APP_ID: optional(process.env.NEXT_PUBLIC_PRIVY_APP_ID),
  NEXT_PUBLIC_PRIVY_CLIENT_ID: optional(
    process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID,
  ),
  NEXT_PUBLIC_MONAD_RPC_URL: optional(process.env.NEXT_PUBLIC_MONAD_RPC_URL),
  NEXT_PUBLIC_PRIVY_SIGNER_QUORUM_ID: optional(
    process.env.NEXT_PUBLIC_PRIVY_SIGNER_QUORUM_ID,
  ),
  NEXT_PUBLIC_PRIVY_VAULT_POLICY_ID: optional(
    process.env.NEXT_PUBLIC_PRIVY_VAULT_POLICY_ID,
  ),
  NEXT_PUBLIC_SPONSORED_CHAIN_IDS: optional(
    process.env.NEXT_PUBLIC_SPONSORED_CHAIN_IDS,
  ),
};

export function readClientEnv(): z.ZodSafeParseResult<ClientEnv> {
  return clientEnvSchema.safeParse(clientEnvValues);
}
