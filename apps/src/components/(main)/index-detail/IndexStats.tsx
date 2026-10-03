import { LocalDate, type StatItem, StatStrip } from "@/components/ui";
import { UserPositionValue } from "@/features/portfolio";
import type { Index } from "@/types/market";
import {
  formatCompactUsd,
  formatPercent,
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
      value: <UserPositionValue indexId={index.id} />,
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
      hint: <LocalDate iso={index.createdAt} format="medium" />,
    },
  ];
  return <StatStrip items={stats} />;
}
