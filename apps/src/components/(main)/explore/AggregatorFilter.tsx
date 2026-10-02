import Link from "next/link";
import type { Aggregator } from "@/types/market";

interface AggregatorFilterProps {
  aggregators: Aggregator[];
  activeId?: string;
}

const CHIP =
  "rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors duration-200 ease-out hover:text-ink aria-[current=page]:bg-surface-raised aria-[current=page]:text-ink";

export function AggregatorFilter({
  aggregators,
  activeId,
}: AggregatorFilterProps) {
  const options = [{ id: undefined, name: "All baskets" }, ...aggregators];
  return (
    <nav aria-label="Filter by aggregator" className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Link
          key={option.name}
          href={option.id ? `/invest?aggregator=${option.id}` : "/invest"}
          aria-current={option.id === activeId ? "page" : undefined}
          className={CHIP}
        >
          {option.name}
        </Link>
      ))}
    </nav>
  );
}
