import { Card } from "@/components/ui";
import type { Portfolio } from "@/features/portfolio";
import { formatSignedUsd } from "@/features/portfolio/utils/signed-usd";
import { formatPercent, formatUsd } from "@/utils/format";
import { ValueSparkline } from "./ValueSparkline";

interface DepositsSummaryProps {
  totals: Portfolio["totals"];
  series: Portfolio["history"];
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

export function DepositsSummary({ totals, series }: DepositsSummaryProps) {
  return (
    <Card className="flex flex-col gap-6 p-6 md:flex-row md:items-center">
      <div className="flex flex-1 flex-col gap-3">
        <span className="text-sm text-ink-muted">Your deposits</span>
        <BigUsd value={totals.valueUsd} />
      </div>
      <ValueSparkline series={series} />
      <dl className="grid grid-cols-2 gap-6 rounded-lg bg-surface-raised p-5 md:w-80">
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-ink-muted">Net APY</dt>
          <dd className="text-2xl font-light text-positive tabular-nums">
            {formatPercent(totals.apy)}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-ink-muted">Earned</dt>
          <dd className="text-2xl font-light tabular-nums">
            {formatSignedUsd(totals.earnedUsd)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
