import Link from "next/link";
import { CryptoIcon, TokenStack } from "@/components/ui";
import type { IndexIcon } from "@/features/portfolio";

export function IndexLink({
  indexId,
  indexName,
  icons,
}: {
  indexId: string;
  indexName: string;
  icons: IndexIcon[];
}) {
  return (
    <Link
      href={`/indexes/${indexId}`}
      className="flex items-center gap-2 whitespace-nowrap hover:underline"
    >
      <TokenStack items={icons} size={20} />
      {indexName}
    </Link>
  );
}

export function AuroraBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs whitespace-nowrap text-ink-muted">
      <CryptoIcon iconKey="/crypto/aurora.png" label="Aurora" size={14} />
      via Aurora Intents
    </span>
  );
}
