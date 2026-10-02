import { CryptoIcon, SegmentedControl } from "@/components/ui";
import type { RoutedAllocation } from "@/types/market";
import type { WeightMode } from "@/utils/draft";
import { formatUsd } from "@/utils/format";

interface WeightsPanelProps {
  mode: WeightMode;
  onModeChange: (mode: WeightMode) => void;
  allocations: RoutedAllocation[];
  customPercents: Record<string, number>;
  onPercentChange: (symbol: string, percent: number) => void;
}

const MODES: readonly WeightMode[] = ["equal", "custom"];
const MODE_LABELS: Record<WeightMode, string> = {
  equal: "Equal",
  custom: "Custom",
};

export function WeightsPanel({
  mode,
  onModeChange,
  allocations,
  customPercents,
  onPercentChange,
}: WeightsPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="w-fit">
        <SegmentedControl
          label="Weighting"
          options={MODES}
          value={mode}
          onChange={onModeChange}
          getLabel={(m) => MODE_LABELS[m]}
        />
      </div>
      <ul className="flex flex-col gap-2">
        {allocations.map((allocation) => (
          <WeightRow
            key={allocation.asset.symbol}
            allocation={allocation}
            percent={
              mode === "custom"
                ? (customPercents[allocation.asset.symbol] ?? 0)
                : undefined
            }
            onPercentChange={onPercentChange}
          />
        ))}
      </ul>
    </div>
  );
}

interface WeightRowProps {
  allocation: RoutedAllocation;
  percent?: number;
  onPercentChange: (symbol: string, percent: number) => void;
}

function WeightRow({
  allocation: { asset, valueUsd },
  percent,
  onPercentChange,
}: WeightRowProps) {
  return (
    <li className="flex items-center gap-3 rounded-md bg-surface-raised px-4 py-3">
      <CryptoIcon iconKey={asset.iconKey} label="" size={24} />
      <span className="flex-1">{asset.symbol}</span>
      {percent !== undefined && (
        <label className="flex items-center gap-1 text-sm text-ink-muted">
          <span className="sr-only">{asset.symbol} weight in percent</span>
          <input
            type="number"
            min={0}
            max={100}
            value={percent}
            onChange={(e) =>
              onPercentChange(asset.symbol, Number(e.target.value))
            }
            className="w-16 rounded-sm bg-canvas px-2 py-1 text-right text-ink"
          />
          %
        </label>
      )}
      <span className="w-24 text-right">{formatUsd(valueUsd)}</span>
    </li>
  );
}
