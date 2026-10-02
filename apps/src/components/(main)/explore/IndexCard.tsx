import Link from "next/link";
import { BRAND_FADE_SURFACE, HalftoneArt, TokenStack } from "@/components/ui";
import { getAggregator, getIndexApy, getVaultAsset } from "@/lib/market";
import type { Index } from "@/types/market";
import { formatCompactUsd, formatPercent } from "@/utils/format";

function membershipLabel(index: Index): string | undefined {
  const labels = [
    index.isCreatedByUser ? "created" : undefined,
    index.isJoined ? "joined" : undefined,
  ].filter(Boolean);
  return labels.length > 0 ? labels.join(" · ") : undefined;
}

export function IndexCard({ index }: { index: Index }) {
  const assets = index.allocations.flatMap(
    (a) => getVaultAsset(a.assetSymbol) ?? [],
  );
  const membership = membershipLabel(index);
  const lead = [...index.allocations].sort((a, b) => b.weight - a.weight)[0];
  const leadAsset = lead && getVaultAsset(lead.assetSymbol);
  return (
    <Link
      href={`/indexes/${index.id}`}
      className={`group relative flex flex-col gap-8 overflow-hidden rounded-lg border border-line ${BRAND_FADE_SURFACE} p-6 transition-colors duration-200 ease-out hover:border-ink-subtle focus-visible:outline-2 focus-visible:outline-accent`}
    >
      {leadAsset && (
        <HalftoneArt
          iconKey={leadAsset.iconKey}
          className="-right-8 -bottom-10 size-44"
        />
      )}
      <div className="relative flex items-start gap-3">
        <TokenStack
          items={assets.map((a) => ({ iconKey: a.iconKey, label: a.symbol }))}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium">{index.name}</span>
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
      <div className="relative flex flex-col gap-1">
        <span className="text-4xl font-light tracking-tight">
          {formatPercent(getIndexApy(index))}
          <span className="ml-1 text-sm text-ink-muted">APY</span>
        </span>
        <span className="text-xs text-ink-muted">
          {getAggregator(index.aggregatorId)?.name} · TVL{" "}
          {formatCompactUsd(index.tvlUsd)}
        </span>
      </div>
    </Link>
  );
}
