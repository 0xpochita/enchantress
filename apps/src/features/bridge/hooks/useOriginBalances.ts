"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/wallet";
import { useApi } from "@/lib/api-client";
import { balancesResponseSchema } from "../types";

const BALANCES_STALE_MS = 15_000;

export function useOriginBalances() {
  const session = useSession();
  const api = useApi();
  return useQuery({
    queryKey: ["origin-balances"],
    queryFn: async () =>
      (await api.get("/api/bridge/balances", balancesResponseSchema)).balances,
    enabled: session.isAuthenticated,
    staleTime: BALANCES_STALE_MS,
  });
}
