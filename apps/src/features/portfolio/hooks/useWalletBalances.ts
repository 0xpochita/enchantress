"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useSession } from "@/features/wallet";
import { ApiError, apiGet } from "@/lib/api-client";

const BALANCES_STALE_MS = 15_000;

const balancesSchema = z.object({
  balances: z.array(
    z.object({
      symbol: z.string(),
      amountBase: z.string(),
      amount: z.number(),
    }),
  ),
});

export function useWalletBalances() {
  const session = useSession();
  const { getAccessToken } = usePrivy();
  return useQuery({
    queryKey: ["balances"],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new ApiError(401, "Please log in again.");
      return apiGet("/api/balances", balancesSchema, token);
    },
    enabled: session.isAuthenticated,
    staleTime: BALANCES_STALE_MS,
    select: (data) => data.balances,
  });
}
