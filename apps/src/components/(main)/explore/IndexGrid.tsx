import Link from "next/link";
import { buttonClassName } from "@/components/ui";
import type { IndexSummary } from "@/features/indexes/utils/route-index";
import { IndexCard } from "./IndexCard";

export function IndexGrid({ summaries }: { summaries: IndexSummary[] }) {
  if (summaries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-line px-6 py-12 text-center">
        <p className="text-ink-muted">No indexes route to this protocol yet.</p>
        <Link
          href="/create"
          className={buttonClassName("primary", "px-5 py-2 text-sm")}
        >
          Create the first one
        </Link>
      </div>
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {summaries.map((summary) => (
        <li key={summary.index.id}>
          <IndexCard summary={summary} />
        </li>
      ))}
    </ul>
  );
}
