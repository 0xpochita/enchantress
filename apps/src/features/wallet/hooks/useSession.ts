"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiGet } from "@/lib/api-client";
import { accountSchema } from "../types/account";

const ACCOUNT_QUERY_KEY = ["account"] as const;
const ACCOUNT_STALE_MS = 5 * 60_000;

async function requireToken(getToken: () => Promise<string | null>) {
  const token = await getToken();
  if (!token) throw new ApiError(401, "Please log in again.");
  return token;
}

export function useSession() {
  const privy = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const queryClient = useQueryClient();
  const wallet = wallets.find((w) => w.walletClientType === "privy");
  const account = useQuery({
    queryKey: ACCOUNT_QUERY_KEY,
    queryFn: async () =>
      apiGet(
        "/api/me",
        accountSchema,
        await requireToken(privy.getAccessToken),
      ),
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
