import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClassName } from "@/components/ui";
import { getIndexSummaries } from "@/features/indexes/services/index-catalog";
import { getVenueSnapshot } from "@/features/vaults/services/venue-snapshot";
import { IndexGrid } from "../explore/IndexGrid";
import { VenueTable } from "./VenueTable";

export async function ProtocolDetailView({ venueId }: { venueId: string }) {
  const [{ venues }, summaries] = await Promise.all([
    getVenueSnapshot(),
    getIndexSummaries(venueId),
  ]);
  const venue = venues.find((candidate) => candidate.id === venueId);
  if (!venue) notFound();
  return (
    <>
      <Link
        href="/deposit"
        className="flex w-fit items-center gap-2 text-sm text-ink-muted hover:text-ink"
      >
        <ChevronLeft aria-hidden className="size-4" />
        Deposit
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="text-3xl font-light tracking-tight">{venue.name}</h1>
          <p className="text-ink-muted">
            Live markets on Monad and the indexes that route into them.
          </p>
        </div>
        <Link
          href="/create"
          className={buttonClassName("primary", "px-5 py-2 text-sm")}
        >
          Create an index
        </Link>
      </div>
      <VenueTable venues={[venue]} />
      <section
        aria-labelledby="protocol-indexes"
        className="flex flex-col gap-4"
      >
        <h2 id="protocol-indexes" className="text-lg font-medium">
          Indexes
        </h2>
        <IndexGrid summaries={summaries} />
      </section>
    </>
  );
}
