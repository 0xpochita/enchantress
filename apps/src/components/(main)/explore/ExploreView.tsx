import type { TagItem } from "@/components/ui";
import { getIndexSummaries } from "@/features/indexes/services/index-catalog";
import {
  type IndexSummary,
  usesVenue,
} from "@/features/indexes/utils/route-index";
import { getVenueSnapshot } from "@/features/vaults/services/venue-snapshot";
import { getBestVenueApy } from "@/features/vaults/utils/eligibility";
import type { Venue } from "@/types/market";
import { ExploreHero } from "./ExploreHero";
import { IndexGrid } from "./IndexGrid";
import { ProtocolFilter } from "./ProtocolFilter";
import { YourIndexes } from "./YourIndexes";

function filterOptions(venues: Venue[], summaries: IndexSummary[]): TagItem[] {
  const all = {
    id: "all",
    label: "All indexes",
    count: summaries.length,
    icons: [],
    href: "/invest",
  };
  return [
    all,
    ...venues.map((venue) => ({
      id: venue.id,
      label: venue.name,
      count: summaries.filter((summary) => usesVenue(summary, venue.id)).length,
      icons: [{ iconKey: venue.iconKey, label: venue.name }],
      href: `/invest?protocol=${venue.id}`,
    })),
  ];
}

export async function ExploreView({ venueId }: { venueId?: string }) {
  const [{ venues }, allSummaries] = await Promise.all([
    getVenueSnapshot(),
    getIndexSummaries(),
  ]);
  const summaries = allSummaries.filter((summary) => summary.index.isFeatured);
  const shown = venueId
    ? summaries.filter((summary) => usesVenue(summary, venueId))
    : summaries;
  return (
    <>
      <ExploreHero
        indexCount={summaries.length}
        vaultCount={venues.length}
        bestApy={getBestVenueApy(venues)}
      />
      <section
        aria-labelledby="indexes-heading"
        className="flex flex-col gap-4"
      >
        <h2 id="indexes-heading" className="text-lg font-medium">
          Featured indexes
        </h2>
        <ProtocolFilter
          options={filterOptions(venues, summaries)}
          activeId={venueId}
        />
        <IndexGrid summaries={shown} />
      </section>
      <YourIndexes
        summaries={allSummaries.filter((summary) => !summary.index.isFeatured)}
      />
    </>
  );
}
