import Link from "next/link";
import { buttonClassName } from "@/components/ui";

export function NotFoundView() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Nothing here</h1>
      <p className="text-ink-muted">
        This basket or aggregator does not exist.
      </p>
      <Link
        href="/invest"
        className={buttonClassName("primary", "px-5 py-2 text-sm")}
      >
        Browse baskets
      </Link>
    </div>
  );
}
