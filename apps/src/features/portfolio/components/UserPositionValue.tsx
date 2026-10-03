"use client";

import { formatUsd } from "@/utils/format";
import { usePortfolio } from "../hooks/usePortfolio";

export function UserPositionValue({ indexId }: { indexId: string }) {
  const portfolio = usePortfolio();
  if (portfolio.isLoading)
    return (
      <span className="inline-block h-5 w-20 animate-pulse rounded bg-surface-raised align-middle">
        <span className="sr-only">Loading your position</span>
      </span>
    );
  const position = portfolio.data?.positions.find((p) => p.indexId === indexId);
  return formatUsd(position?.valueUsd ?? 0);
}
