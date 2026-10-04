"use client";

import type { IndexSummary } from "@/features/indexes/utils/route-index";
import { useSession } from "@/features/wallet";
import { IndexCard } from "./IndexCard";

function IndexSection({
  id,
  title,
  summaries,
}: {
  id: string;
  title: string;
  summaries: IndexSummary[];
}) {
  if (summaries.length === 0) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="text-lg font-medium">
        {title}
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaries.map((summary) => (
          <li key={summary.index.id}>
            <IndexCard summary={summary} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function YourIndexes({ summaries }: { summaries: IndexSummary[] }) {
  const { address } = useSession();
  const owner = address?.toLowerCase();
  const isMine = (summary: IndexSummary) =>
    owner !== undefined && summary.index.creator.toLowerCase() === owner;
  const mine = summaries.filter(isMine);
  const community = summaries.filter(
    (summary) => !isMine(summary) && summary.index.tvlUsd > 0,
  );
  return (
    <>
      <IndexSection
        id="your-indexes-heading"
        title="Your indexes"
        summaries={mine}
      />
      <IndexSection
        id="community-indexes-heading"
        title="Community indexes"
        summaries={community}
      />
    </>
  );
}
