import { Card, Stat } from "@/components/ui";
import type { Index } from "@/types/market";
import {
  formatCompactUsd,
  formatDate,
  formatPercent,
  formatUsd,
  shortenAddress,
} from "@/utils/format";

export function IndexStats({ index, apy }: { index: Index; apy: number }) {
  const stats = [
    {
      label: "Yield APY",
      value: formatPercent(apy),
      hint: "on your positions",
      tone: "positive" as const,
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
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {stats.map((stat) => (
        <li key={stat.label}>
          <Card className="h-full p-6">
            <Stat
              label={stat.label}
              value={stat.value}
              hint={stat.hint}
              tone={stat.tone}
            />
          </Card>
        </li>
      ))}
    </ul>
  );
}
