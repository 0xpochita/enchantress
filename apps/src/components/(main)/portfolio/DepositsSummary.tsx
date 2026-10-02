import { Card } from "@/components/ui";
import { formatPercent, formatUsd } from "@/utils/format";
import type { PortfolioSummary, ValuePoint } from "@/utils/portfolio";
import { ValueSparkline } from "./ValueSparkline";

interface DepositsSummaryProps {
  summary: PortfolioSummary;
  series: ValuePoint[];
}

function BigUsd({ value }: { value: number }) {
  const text = formatUsd(value);
  return (
    <p className="text-5xl font-light tracking-tight tabular-nums">
      <span className="text-ink-subtle">{text.slice(0, 1)}</span>
      {text.slice(1)}
    </p>
  );
}

export function DepositsSummary({ summary, series }: DepositsSummaryProps) {
  return (
    <Card className="flex flex-col gap-6 p-6 md:flex-row md:items-center">
      <div className="flex flex-1 flex-col gap-3">
        <span className="text-sm text-ink-muted">Your deposits</span>
        <BigUsd value={summary.investedUsd} />
      </div>
      <ValueSparkline series={series} />
      <dl className="grid grid-cols-2 gap-6 rounded-lg bg-surface-raised p-5 md:w-80">
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-ink-muted">Net APY</dt>
          <dd className="text-2xl font-light text-positive tabular-nums">
            {formatPercent(summary.apy)}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-ink-muted">Rewards / year</dt>
          <dd className="text-2xl font-light tabular-nums">
            {formatUsd(summary.yearlyUsd)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
