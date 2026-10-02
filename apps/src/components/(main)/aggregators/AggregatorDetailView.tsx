import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClassName } from "@/components/ui";
import { getAggregator, getAggregatorVenues, getIndexes } from "@/lib/market";
import { IndexGrid } from "../explore/IndexGrid";
import { VenueTable } from "./VenueTable";

export function AggregatorDetailView({
  aggregatorId,
}: {
  aggregatorId: string;
}) {
  const aggregator = getAggregator(aggregatorId);
  if (!aggregator) notFound();
  return (
    <>
      <Link
        href="/aggregators"
        className="flex w-fit items-center gap-2 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All aggregators
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="text-3xl font-light tracking-tight">
            {aggregator.name}
          </h1>
          <p className="text-ink-muted">{aggregator.description}</p>
        </div>
        <Link
          href="/create"
          className={buttonClassName("primary", "px-5 py-2 text-sm")}
        >
          Create an index
        </Link>
      </div>
      <VenueTable venues={getAggregatorVenues(aggregator)} />
      <section
        aria-labelledby="aggregator-indexes"
        className="flex flex-col gap-4"
      >
        <h2 id="aggregator-indexes" className="text-lg font-medium">
          Indexes
        </h2>
        <IndexGrid indexes={getIndexes(aggregator.id)} />
      </section>
    </>
  );
}
