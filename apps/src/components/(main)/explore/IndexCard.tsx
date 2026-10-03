import Link from "next/link";
import { BRAND_FADE_SURFACE, HalftoneArt, TokenStack } from "@/components/ui";
import type { IndexSummary } from "@/lib/market";
import type { Venue } from "@/types/market";
import { formatCompactUsd, formatPercent } from "@/utils/format";

function uniqueVenues(summary: IndexSummary): Venue[] {
  return [
    ...new Map(summary.allocations.map((a) => [a.venue.id, a.venue])).values(),
  ];
}

export function IndexCard({ summary }: { summary: IndexSummary }) {
  const { index, allocations, apy } = summary;
  const venues = uniqueVenues(summary);
  const lead = [...allocations].sort((a, b) => b.weight - a.weight)[0];
  return (
    <Link
      href={`/indexes/${index.id}`}
      className={`group relative flex flex-col gap-8 overflow-hidden rounded-lg border border-line ${BRAND_FADE_SURFACE} p-6 transition-colors duration-200 ease-out hover:border-ink-subtle focus-visible:outline-2 focus-visible:outline-accent`}
    >
      {lead && (
        <HalftoneArt
          iconKey={lead.asset.iconKey}
          className="-right-8 -bottom-10 size-44"
        />
      )}
      <div className="relative flex items-start gap-3">
        <TokenStack
          items={venues.map((v) => ({ iconKey: v.iconKey, label: v.name }))}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium">{index.name}</span>
          <span className="truncate text-sm text-ink-muted">
            {allocations.map((a) => a.asset.symbol).join(" · ")}
          </span>
        </div>
      </div>
      <div className="relative flex flex-col gap-1">
        <span className="text-4xl font-light tracking-tight">
          {formatPercent(apy)}
          <span className="ml-1 text-sm text-ink-muted">APY</span>
        </span>
        <span className="text-xs text-ink-muted">
          {venues.map((v) => v.name).join(" + ")} · TVL{" "}
          {formatCompactUsd(index.tvlUsd)}
        </span>
      </div>
    </Link>
  );
}
