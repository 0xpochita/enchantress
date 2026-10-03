"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/wallet";
import { useApi } from "@/lib/api-client";
import { portfolioSchema } from "../types";

const PORTFOLIO_STALE_MS = 30_000;

export function usePortfolio() {
  const session = useSession();
  const api = useApi();
  return useQuery({
    queryKey: ["portfolio", session.address],
    queryFn: () => api.get("/api/portfolio", portfolioSchema),
    enabled: session.isAuthenticated,
    staleTime: PORTFOLIO_STALE_MS,
    refetchOnWindowFocus: true,
  });
}
