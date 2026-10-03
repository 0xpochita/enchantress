"use client";

import type { IndexSummary } from "@/features/indexes/utils/route-index";
import { useSession } from "@/features/wallet";
import { IndexCard } from "./IndexCard";

export function YourIndexes({ summaries }: { summaries: IndexSummary[] }) {
  const { address } = useSession();
  const owner = address?.toLowerCase();
  const mine = summaries.filter(
    (summary) => owner && summary.index.creator.toLowerCase() === owner,
  );
  if (mine.length === 0) return null;
  return (
    <section
      aria-labelledby="your-indexes-heading"
      className="flex flex-col gap-4"
    >
      <h2 id="your-indexes-heading" className="text-lg font-medium">
        Your indexes
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mine.map((summary) => (
          <li key={summary.index.id}>
            <IndexCard summary={summary} />
          </li>
        ))}
      </ul>
    </section>
  );
}
