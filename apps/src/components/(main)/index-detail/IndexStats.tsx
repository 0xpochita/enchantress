import { type StatItem, StatStrip } from "@/components/ui";
import type { Index } from "@/types/market";
import {
  formatCompactUsd,
  formatDate,
  formatPercent,
  formatUsd,
  shortenAddress,
} from "@/utils/format";

export function IndexStats({ index, apy }: { index: Index; apy: number }) {
  const stats: StatItem[] = [
    {
      label: "Yield APY",
      value: formatPercent(apy),
      hint: "on your positions",
      tone: "positive",
    },
    {
      label: "Your position",
      value: formatUsd(index.positionUsd),
      hint: "this index, your wallet",
    },
    {
      label: "Total value locked",
      value: formatCompactUsd(index.tvlUsd),
      hint: "all depositors",
    },
    {
      label: "Creator",
      value: index.isCreatedByUser ? "You" : shortenAddress(index.creator),
      hint: formatDate(index.createdAt),
    },
  ];
  return <StatStrip items={stats} />;
}
