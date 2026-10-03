"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api-client";
import { accountSchema } from "../types/account";

const ACCOUNT_QUERY_KEY = ["account"] as const;
const ACCOUNT_STALE_MS = 5 * 60_000;

export function useSession() {
  const privy = usePrivy();
  const api = useApi();
  const { ready: walletsReady, wallets } = useWallets();
  const queryClient = useQueryClient();
  const wallet = wallets.find((w) => w.walletClientType === "privy");
  const account = useQuery({
    queryKey: ACCOUNT_QUERY_KEY,
    queryFn: () => api.get("/api/me", accountSchema),
    enabled: privy.authenticated && Boolean(wallet),
    staleTime: ACCOUNT_STALE_MS,
  });
  const logout = async () => {
    await privy.logout();
    queryClient.removeQueries({ queryKey: ACCOUNT_QUERY_KEY });
  };
  return {
    isReady: privy.ready && walletsReady,
    isAuthenticated: privy.authenticated,
    address: wallet?.address,
    account,
    login: () => privy.login(),
    logout,
  };
}
