import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { buttonClassName, TokenStack } from "@/components/ui";
import type { Aggregator, VaultAsset } from "@/types/market";

interface IndexHeaderProps {
  name: string;
  assets: VaultAsset[];
  aggregator?: Aggregator;
}

export function IndexHeader({ name, assets, aggregator }: IndexHeaderProps) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/invest"
        className="flex w-fit items-center gap-2 text-sm text-ink-muted hover:text-ink"
      >
        <ChevronLeft aria-hidden className="size-4" />
        All indexes
      </Link>
      <div className="flex flex-wrap items-center gap-4">
        <TokenStack
          items={assets.map((a) => ({ iconKey: a.iconKey, label: a.symbol }))}
          size={44}
        />
        <div className="flex flex-1 flex-col">
          <h1 className="text-3xl font-light tracking-tight">{name}</h1>
          <p className="text-sm text-ink-muted">
            {assets.map((a) => a.symbol).join(" · ")}
            {aggregator && (
              <>
                {" in "}
                <Link
                  href={`/aggregators/${aggregator.id}`}
                  className="text-brand hover:underline"
                >
                  {aggregator.name}
                </Link>
              </>
            )}
          </p>
        </div>
        <a
          href="#deposit-panel"
          className={buttonClassName("primary", "px-5 py-2 text-sm")}
        >
          Deposit
        </a>
      </div>
    </div>
  );
}
