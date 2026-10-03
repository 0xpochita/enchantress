"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/wallet";
import { ApiError, apiGet } from "@/lib/api-client";
import { balancesResponseSchema } from "../types";

const BALANCES_STALE_MS = 15_000;

export function useOriginBalances() {
  const session = useSession();
  const { getAccessToken } = usePrivy();
  return useQuery({
    queryKey: ["origin-balances"],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new ApiError(401, "Please log in again.");
      return (
        await apiGet("/api/bridge/balances", balancesResponseSchema, token)
      ).balances;
    },
    enabled: session.isAuthenticated,
    staleTime: BALANCES_STALE_MS,
  });
}
