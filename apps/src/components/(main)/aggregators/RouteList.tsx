import { motion } from "motion/react";
import { Card, TagBar, type TagItem, TokenStack } from "@/components/ui";
import { ALL_AGGREGATORS, type DepositRoutes } from "@/hooks/useDepositRoutes";
import type { Aggregator, IndexQuote } from "@/types/market";
import { formatPercent, formatSignedPercent, formatUsd } from "@/utils/format";
import type { RankedRoute } from "@/utils/routes";

const ROW_STAGGER_S = 0.06;

interface RouteListProps {
  deposit: DepositRoutes;
  quotesById: Map<string, IndexQuote>;
  aggregators: Aggregator[];
}

function venueIcons(quotes: IndexQuote[]) {
  const venues = new Map(
    quotes.flatMap((q) => q.venues).map((v) => [v.name, v]),
  );
  return [...venues.values()].map((v) => ({
    iconKey: v.iconKey,
    label: v.name,
  }));
}

function routeTags(quotes: IndexQuote[], aggregators: Aggregator[]): TagItem[] {
  return [
    { id: ALL_AGGREGATORS, label: "All", count: quotes.length, icons: [] },
    ...aggregators.map((aggregator) => {
      const matching = quotes.filter((q) => q.aggregatorId === aggregator.id);
      return {
        id: aggregator.id,
        label: aggregator.name,
        count: matching.length,
        icons: venueIcons(matching),
      };
    }),
  ];
}

export function RouteList({
  deposit,
  quotesById,
  aggregators,
}: RouteListProps) {
  return (
    <Card className="flex h-full min-h-0 flex-col gap-4 p-6 lg:max-h-[38rem]">
      <h2 className="text-sm text-ink-muted">Routes</h2>
      <TagBar
        label="Filter routes by aggregator"
        items={routeTags([...quotesById.values()], aggregators)}
        activeId={deposit.aggregatorId}
        layoutId="route-filter"
        wrap
        onSelect={deposit.setAggregatorId}
      />
      <ul className="flex min-h-0 flex-col divide-y divide-line overflow-y-auto">
        {deposit.routes.map((route, position) => {
          const quote = quotesById.get(route.indexId);
          if (!quote) return null;
          return (
            <motion.li
              key={route.indexId}
              layout
              className="py-1"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: position * ROW_STAGGER_S,
                duration: 0.3,
                ease: "easeOut",
              }}
            >
              <RouteRow
                route={route}
                quote={quote}
                isSelected={route.indexId === deposit.selected?.indexId}
                onSelect={() => deposit.selectIndex(route.indexId)}
              />
            </motion.li>
          );
        })}
      </ul>
    </Card>
  );
}

interface RouteRowProps {
  route: RankedRoute;
  quote: IndexQuote;
  isSelected: boolean;
  onSelect: () => void;
}

function RouteRow({ route, quote, isSelected, onSelect }: RouteRowProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors duration-200 ease-out hover:bg-surface-raised aria-pressed:bg-surface-raised"
    >
      <TokenStack
        items={quote.venues.map((v) => ({ iconKey: v.iconKey, label: v.name }))}
        size={28}
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2 font-medium">
          <span className="truncate">{quote.name}</span>
          {route.isBest && (
            <span className="text-xs font-normal text-brand">Best</span>
          )}
        </span>
        <span className="truncate text-xs text-ink-muted">
          {quote.venues.map((v) => v.name).join(" · ")}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="font-medium">{formatPercent(route.apy)}</span>
        <span
          className={`text-xs ${route.isBest ? "text-ink-muted" : "text-negative"}`}
        >
          {route.isBest
            ? `${formatUsd(route.yearlyUsd)}/yr`
            : formatSignedPercent(route.deltaPct)}
        </span>
      </span>
    </button>
  );
}
