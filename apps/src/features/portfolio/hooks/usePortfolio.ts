"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/wallet";
import { ApiError, apiGet } from "@/lib/api-client";
import { portfolioSchema } from "../types";

const PORTFOLIO_STALE_MS = 30_000;

export function usePortfolio() {
  const session = useSession();
  const { getAccessToken } = usePrivy();
  return useQuery({
    queryKey: ["portfolio", session.address],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new ApiError(401, "Please log in again.");
      return apiGet("/api/portfolio", portfolioSchema, token);
    },
    enabled: session.isAuthenticated,
    staleTime: PORTFOLIO_STALE_MS,
    refetchOnWindowFocus: true,
  });
}
