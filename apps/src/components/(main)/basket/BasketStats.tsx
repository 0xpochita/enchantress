import { Card, Stat } from "@/components/ui";
import type { Basket } from "@/types/market";
import {
  formatCompactUsd,
  formatDate,
  formatPercent,
  formatUsd,
  shortenAddress,
} from "@/utils/format";

export function BasketStats({ basket, apy }: { basket: Basket; apy: number }) {
  const stats = [
    {
      label: "Yield APY",
      value: formatPercent(apy),
      hint: "on your positions",
      tone: "positive" as const,
    },
    {
      label: "Your position",
      value: formatUsd(basket.positionUsd),
      hint: "this basket, your wallet",
    },
    {
      label: "Total value locked",
      value: formatCompactUsd(basket.tvlUsd),
      hint: "all depositors",
    },
    {
      label: "Creator",
      value: basket.isCreatedByUser ? "You" : shortenAddress(basket.creator),
      hint: formatDate(basket.createdAt),
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
