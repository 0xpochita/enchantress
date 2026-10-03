import type { ReactNode } from "react";

export interface StatItem {
  label: string;
  value: ReactNode;
  hint: ReactNode;
  tone?: "default" | "positive";
}

export function StatStrip({ items }: { items: StatItem[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs text-ink-muted">{item.label}</dt>
          <dd
            className={`truncate text-xl font-light ${item.tone === "positive" ? "text-positive" : ""}`}
          >
            {item.value}
          </dd>
          <dd className="truncate text-xs text-ink-subtle">{item.hint}</dd>
        </div>
      ))}
    </dl>
  );
}
