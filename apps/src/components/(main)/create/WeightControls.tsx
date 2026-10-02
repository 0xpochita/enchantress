import { CryptoIcon, SegmentedControl } from "@/components/ui";
import type { RoutedAllocation } from "@/types/market";
import type { WeightMode } from "@/utils/draft";

interface WeightControlsProps {
  mode: WeightMode;
  onModeChange: (mode: WeightMode) => void;
  allocations: RoutedAllocation[];
  customPercents: Record<string, number>;
  onPercentChange: (symbol: string, percent: number) => void;
}

const MODES: readonly WeightMode[] = ["equal", "custom"];
const MODE_LABELS: Record<WeightMode, string> = {
  equal: "Equal split",
  custom: "Custom",
};
const FULL = 100;

export function WeightControls({
  mode,
  onModeChange,
  allocations,
  customPercents,
  onPercentChange,
}: WeightControlsProps) {
  const total = allocations.reduce(
    (sum, a) => sum + (customPercents[a.asset.symbol] ?? 0),
    0,
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-full bg-surface p-0.5">
        <SegmentedControl
          label="Weighting"
          options={MODES}
          value={mode}
          onChange={onModeChange}
          getLabel={(m) => MODE_LABELS[m]}
        />
      </div>
      {mode === "custom" && allocations.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {allocations.map(({ asset }) => (
            <li key={asset.symbol} className="flex items-center gap-2 text-sm">
              <CryptoIcon iconKey={asset.iconKey} label="" size={20} />
              <span className="flex-1">{asset.symbol}</span>
              <label className="flex items-center gap-1 text-ink-muted">
                <span className="sr-only">
                  {asset.symbol} weight in percent
                </span>
                <input
                  type="number"
                  min={0}
                  max={FULL}
                  value={customPercents[asset.symbol] ?? 0}
                  onChange={(e) =>
                    onPercentChange(asset.symbol, Number(e.target.value))
                  }
                  className="w-16 rounded-sm bg-surface px-2 py-1 text-right text-ink"
                />
                %
              </label>
            </li>
          ))}
          <li
            className={`text-right text-xs ${total === FULL ? "text-positive" : "text-ink-subtle"}`}
          >
            Total {total}% of 100%
          </li>
        </ul>
      )}
    </div>
  );
}
