import { Fuel, Zap } from "lucide-react";
import { Card, SegmentedControl, TokenStack } from "@/components/ui";
import { ALL_AGGREGATORS, type DepositRoutes } from "@/hooks/useDepositRoutes";
import type { Aggregator, BasketQuote } from "@/types/market";
import { formatPercent, formatSignedPercent, formatUsd } from "@/utils/format";
import type { RankedRoute } from "@/utils/routes";

interface RouteListProps {
  deposit: DepositRoutes;
  quotesById: Map<string, BasketQuote>;
  aggregators: Aggregator[];
}

export function RouteList({
  deposit,
  quotesById,
  aggregators,
}: RouteListProps) {
  const filterIds = [ALL_AGGREGATORS, ...aggregators.map((a) => a.id)];
  const filterLabel = (id: string) =>
    aggregators.find((a) => a.id === id)?.name ?? "All";
  return (
    <Card className="flex min-h-0 flex-col gap-4 p-6 lg:max-h-[38rem]">
      <h2 className="text-lg font-medium">Routes</h2>
      <SegmentedControl
        label="Aggregator"
        options={filterIds}
        value={deposit.aggregatorId}
        onChange={deposit.setAggregatorId}
        getLabel={filterLabel}
      />
      <ul className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
        {deposit.routes.map((route) => {
          const quote = quotesById.get(route.basketId);
          if (!quote) return null;
          return (
            <li key={route.basketId}>
              <RouteCard
                route={route}
                quote={quote}
                isSelected={route.basketId === deposit.selected?.basketId}
                isCrossChain={deposit.isCrossChain}
                onSelect={() => deposit.selectBasket(route.basketId)}
              />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

interface RouteCardProps {
  route: RankedRoute;
  quote: BasketQuote;
  isSelected: boolean;
  isCrossChain: boolean;
  onSelect: () => void;
}

function RouteCard({
  route,
  quote,
  isSelected,
  isCrossChain,
  onSelect,
}: RouteCardProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className="flex w-full flex-col gap-2 rounded-lg border border-transparent bg-surface-raised p-4 text-left transition-colors duration-200 ease-out hover:bg-surface-hover aria-pressed:border-accent"
    >
      <span className="flex items-center gap-3">
        <TokenStack
          items={quote.assets.map((a) => ({
            iconKey: a.iconKey,
            label: a.symbol,
          }))}
          size={28}
        />
        <span className="text-xl font-semibold">
          {formatPercent(route.apy)} APY
        </span>
        {route.isBest && (
          <span className="ml-auto rounded-full bg-surface-hover px-3 py-1 text-sm text-positive">
            Best
          </span>
        )}
      </span>
      <span className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-muted">
        <span>
          via <span className="text-ink">{quote.name}</span> ·{" "}
          {quote.aggregatorName}
        </span>
        <span className="flex items-center gap-2">
          {isCrossChain && (
            <Zap aria-label="Aurora Intents" className="size-4 text-accent" />
          )}
          <Fuel aria-hidden className="size-4" />
          {formatUsd(route.feeUsd)}
          <span>{formatUsd(route.yearlyUsd)}/yr</span>
          {!route.isBest && (
            <span className="text-negative">
              {formatSignedPercent(route.deltaPct)}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
