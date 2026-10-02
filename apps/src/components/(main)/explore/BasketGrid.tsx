import Link from "next/link";
import { buttonClassName } from "@/components/ui";
import type { Basket } from "@/types/market";
import { BasketCard } from "./BasketCard";

export function BasketGrid({ baskets }: { baskets: Basket[] }) {
  if (baskets.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-line px-6 py-12 text-center">
        <p className="text-ink-muted">No baskets in this aggregator yet.</p>
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
      {baskets.map((basket) => (
        <li key={basket.id}>
          <BasketCard basket={basket} />
        </li>
      ))}
    </ul>
  );
}
