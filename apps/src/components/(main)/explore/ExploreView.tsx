import {
  getAggregators,
  getBestVenueApy,
  getIndexes,
  getVenues,
} from "@/lib/market";
import { AggregatorFilter } from "./AggregatorFilter";
import { ExploreHero } from "./ExploreHero";
import { IndexGrid } from "./IndexGrid";

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
        <AggregatorFilter
          aggregators={getAggregators()}
          activeId={aggregatorId}
        />
        <IndexGrid indexes={getIndexes(aggregatorId)} />
      </section>
    </>
  );
}
