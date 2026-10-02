import Link from "next/link";
import { buttonClassName } from "@/components/ui";

export function NotFoundView() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-3xl font-light tracking-tight">Nothing here</h1>
      <p className="text-ink-muted">This index or aggregator does not exist.</p>
      <Link
        href="/invest"
        className={buttonClassName("primary", "px-5 py-2 text-sm")}
      >
        Browse indexes
      </Link>
    </div>
  );
}
