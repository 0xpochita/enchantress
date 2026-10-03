import Link from "next/link";
import { CryptoIcon, TokenStack } from "@/components/ui";
import type { IndexIcon } from "@/features/portfolio";
import { AuroraIntents } from "../flow/AuroraIntents";

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

export function RouteCell({ viaAurora }: { viaAurora: boolean }) {
  if (!viaAurora)
    return (
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <CryptoIcon iconKey="monad" label="" size={14} />
        Monad
      </span>
    );
  return (
    <span className="whitespace-nowrap">
      <AuroraIntents />
    </span>
  );
}
