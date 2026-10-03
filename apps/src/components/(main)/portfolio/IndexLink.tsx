import Link from "next/link";
import { TokenStack } from "@/components/ui";
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
