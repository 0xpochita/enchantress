import Link from "next/link";
import { TokenStack } from "@/components/ui";
import { getAggregator, getBasketApy, getVaultAsset } from "@/lib/market";
import type { Basket } from "@/types/market";
import { formatCompactUsd, formatPercent } from "@/utils/format";

function membershipLabel(basket: Basket): string | undefined {
  const labels = [
    basket.isCreatedByUser ? "created" : undefined,
    basket.isJoined ? "joined" : undefined,
  ].filter(Boolean);
  return labels.length > 0 ? labels.join(" · ") : undefined;
}

export function BasketCard({ basket }: { basket: Basket }) {
  const assets = basket.allocations.flatMap(
    (a) => getVaultAsset(a.assetSymbol) ?? [],
  );
  const membership = membershipLabel(basket);
  return (
    <Link
      href={`/baskets/${basket.id}`}
      className="flex flex-col gap-6 rounded-lg border border-line bg-surface p-6 transition-colors duration-200 ease-out hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-accent"
    >
      <div className="flex items-start gap-3">
        <TokenStack
          items={assets.map((a) => ({ iconKey: a.iconKey, label: a.symbol }))}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium">{basket.name}</span>
          <span className="truncate text-sm text-ink-muted">
            {assets.map((a) => a.symbol).join(" · ")}
          </span>
        </div>
        {membership && (
          <span className="rounded-full bg-surface-raised px-2 py-1 text-xs text-positive">
            {membership}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-4">
        <span className="text-4xl font-semibold">
          {formatPercent(getBasketApy(basket))}
          <span className="ml-1 text-sm font-normal text-ink-muted">APY</span>
        </span>
        <span className="text-right text-xs text-ink-subtle">
          {getAggregator(basket.aggregatorId)?.name}
          <br />
          TVL {formatCompactUsd(basket.tvlUsd)}
        </span>
      </div>
    </Link>
  );
}
