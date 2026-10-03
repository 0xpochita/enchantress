"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useSession } from "@/features/wallet";
import { useApi } from "@/lib/api-client";

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
  const api = useApi();
  return useQuery({
    queryKey: ["balances"],
    queryFn: () => api.get("/api/balances", balancesSchema),
    enabled: session.isAuthenticated,
    staleTime: BALANCES_STALE_MS,
    select: (data) => data.balances,
  });
}
