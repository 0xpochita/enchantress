import { TokenStack } from "@/components/ui";
import type { Aggregator, Venue } from "@/types/market";
import { formatPercent } from "@/utils/format";

interface AggregatorPickerProps {
  aggregators: Aggregator[];
  venuesByAggregator: Record<string, Venue[]>;
  activeId: string;
  onChange: (aggregatorId: string) => void;
}

const bestApy = (venues: Venue[]) =>
  Math.max(0, ...venues.flatMap((v) => v.markets.map((m) => m.apy)));

export function AggregatorPicker({
  aggregators,
  venuesByAggregator,
  activeId,
  onChange,
}: AggregatorPickerProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">Aggregator</legend>
      {aggregators.map((aggregator) => {
        const venues = venuesByAggregator[aggregator.id] ?? [];
        return (
          <button
            key={aggregator.id}
            type="button"
            aria-pressed={aggregator.id === activeId}
            onClick={() => onChange(aggregator.id)}
            className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5 text-left text-sm transition-colors duration-200 ease-out hover:bg-surface-hover aria-pressed:border-accent"
          >
            <TokenStack
              items={venues.map((v) => ({ iconKey: v.iconKey, label: v.name }))}
              size={20}
            />
            <span className="flex-1 truncate">{aggregator.name}</span>
            <span className="text-xs text-ink-muted">
              up to {formatPercent(bestApy(venues))}
            </span>
          </button>
        );
      })}
    </fieldset>
  );
}
