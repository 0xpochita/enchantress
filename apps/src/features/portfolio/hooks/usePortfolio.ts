"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/wallet";
import { useApi } from "@/lib/api-client";
import { portfolioSchema } from "../types";

const PORTFOLIO_STALE_MS = 30_000;
const ACTIVE_POLL_MS = 10_000;
const ACTIVE_STATUSES = new Set(["bridging", "executing"]);

export function isRunning(status: string): boolean {
  return ACTIVE_STATUSES.has(status);
}

export function usePortfolio() {
  const session = useSession();
  const api = useApi();
  return useQuery({
    queryKey: ["portfolio", session.address],
    queryFn: () => api.get("/api/portfolio", portfolioSchema),
    enabled: session.isAuthenticated,
    staleTime: PORTFOLIO_STALE_MS,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      query.state.data?.purchases.some((p) => isRunning(p.status))
        ? ACTIVE_POLL_MS
        : false,
  });
}
