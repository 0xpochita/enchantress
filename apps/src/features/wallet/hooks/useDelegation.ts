"use client";

import { useSigners } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { readClientEnv } from "@/config/env.client";
import { useApi } from "@/lib/api-client";
import { withWalletPrompt } from "@/lib/wallet-prompt";
import { accountSchema } from "../types/account";
import { useSession } from "./useSession";

const ACCOUNT_QUERY_KEY = ["account"] as const;

function signerConfig(): { signerId: string; policyId: string } {
  const env = readClientEnv();
  const signerId = env.success
    ? env.data.NEXT_PUBLIC_PRIVY_SIGNER_QUORUM_ID
    : undefined;
  const policyId = env.success
    ? env.data.NEXT_PUBLIC_PRIVY_VAULT_POLICY_ID
    : undefined;
  if (!signerId || !policyId)
    throw new Error(
      "Vault access is not configured yet. Please try again later.",
    );
  return { signerId, policyId };
}

export function useDelegation() {
  const session = useSession();
  const api = useApi();
  const { addSigners, removeSigners } = useSigners();
  const queryClient = useQueryClient();
  const refresh = async () => {
    const account = await api.post("/api/me/refresh", {}, accountSchema);
    queryClient.setQueryData(ACCOUNT_QUERY_KEY, account);
    return account;
  };
  const enable = async () => {
    if (!session.address)
      throw new Error("Your wallet is still being created.");
    const { signerId, policyId } = signerConfig();
    const address = session.address;
    await withWalletPrompt(() =>
      addSigners({ address, signers: [{ signerId, policyIds: [policyId] }] }),
    );
    return refresh();
  };
  const revoke = async () => {
    if (!session.address) return;
    await removeSigners({ address: session.address });
    await refresh();
  };
  return {
    isDelegated: session.account.data?.isDelegated ?? false,
    enable,
    revoke,
  };
}
