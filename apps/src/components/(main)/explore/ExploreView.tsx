import type { TagItem } from "@/components/ui";
import {
  getAggregators,
  getAggregatorVenues,
  getBestVenueApy,
  getIndexes,
  getVenues,
} from "@/lib/market";
import { AggregatorFilter } from "./AggregatorFilter";
import { ExploreHero } from "./ExploreHero";
import { IndexGrid } from "./IndexGrid";

function filterOptions(): TagItem[] {
  const all = {
    id: "all",
    label: "All indexes",
    count: getIndexes().length,
    icons: [],
    href: "/invest",
  };
  return [
    all,
    ...getAggregators().map((aggregator) => ({
      id: aggregator.id,
      label: aggregator.name,
      href: `/invest?aggregator=${aggregator.id}`,
      count: getIndexes(aggregator.id).length,
      icons: getAggregatorVenues(aggregator).map((venue) => ({
        iconKey: venue.iconKey,
        label: venue.name,
      })),
    })),
  ];
}

export function ExploreView({ aggregatorId }: { aggregatorId?: string }) {
  return (
    <>
      <ExploreHero
        indexCount={getIndexes().length}
        vaultCount={getVenues().length}
        bestApy={getBestVenueApy()}
      />
      <section
        aria-labelledby="indexes-heading"
        className="flex flex-col gap-4"
      >
        <h2 id="indexes-heading" className="text-lg font-medium">
          Featured indexes
        </h2>
        <AggregatorFilter options={filterOptions()} activeId={aggregatorId} />
        <IndexGrid indexes={getIndexes(aggregatorId)} />
      </section>
    </>
  );
}
