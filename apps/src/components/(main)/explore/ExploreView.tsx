import {
  getAggregators,
  getBaskets,
  getBestVenueApy,
  getChains,
  getVenues,
} from "@/lib/market";
import { AggregatorFilter } from "./AggregatorFilter";
import { BasketGrid } from "./BasketGrid";
import { ExploreHero } from "./ExploreHero";

export function ExploreView({ aggregatorId }: { aggregatorId?: string }) {
  return (
    <>
      <ExploreHero
        basketCount={getBaskets().length}
        vaultCount={getVenues().length}
        bestApy={getBestVenueApy()}
        chainCount={getChains().length}
      />
      <section
        aria-labelledby="baskets-heading"
        className="flex flex-col gap-4"
      >
        <h2 id="baskets-heading" className="text-lg font-medium">
          Featured baskets
        </h2>
        <AggregatorFilter
          aggregators={getAggregators()}
          activeId={aggregatorId}
        />
        <BasketGrid baskets={getBaskets(aggregatorId)} />
      </section>
    </>
  );
}
