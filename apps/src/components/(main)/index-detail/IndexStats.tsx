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
    <dl className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs text-ink-muted">{stat.label}</dt>
          <dd
            className={`truncate text-xl font-light ${stat.tone === "positive" ? "text-positive" : ""}`}
          >
            {stat.value}
          </dd>
          <dd className="truncate text-xs text-ink-subtle">{stat.hint}</dd>
        </div>
      ))}
    </dl>
  );
}
