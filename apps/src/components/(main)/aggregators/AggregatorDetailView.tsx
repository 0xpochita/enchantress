import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClassName } from "@/components/ui";
import { getAggregator, getAggregatorVenues, getBaskets } from "@/lib/market";
import { BasketGrid } from "../explore/BasketGrid";
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
          <h1 className="text-3xl font-bold tracking-tight">
            {aggregator.name}
          </h1>
          <p className="text-ink-muted">{aggregator.description}</p>
        </div>
        <Link
          href="/create"
          className={buttonClassName("primary", "px-5 py-2 text-sm")}
        >
          Create a basket
        </Link>
      </div>
      <VenueTable venues={getAggregatorVenues(aggregator)} />
      <section
        aria-labelledby="aggregator-baskets"
        className="flex flex-col gap-4"
      >
        <h2 id="aggregator-baskets" className="text-lg font-medium">
          Baskets
        </h2>
        <BasketGrid baskets={getBaskets(aggregator.id)} />
      </section>
    </>
  );
}
