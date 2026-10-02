import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { buttonClassName, TokenStack } from "@/components/ui";
import type { Aggregator, VaultAsset } from "@/types/market";

interface BasketHeaderProps {
  name: string;
  assets: VaultAsset[];
  aggregator?: Aggregator;
}

export function BasketHeader({ name, assets, aggregator }: BasketHeaderProps) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/invest"
        className="flex w-fit items-center gap-2 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All baskets
      </Link>
      <div className="flex flex-wrap items-center gap-4">
        <TokenStack
          items={assets.map((a) => ({ iconKey: a.iconKey, label: a.symbol }))}
          size={44}
        />
        <div className="flex flex-1 flex-col">
          <h1 className="text-2xl font-semibold">{name}</h1>
          <p className="text-sm text-ink-muted">
            {assets.map((a) => a.symbol).join(" · ")}
            {aggregator && (
              <>
                {" in "}
                <Link
                  href={`/aggregators/${aggregator.id}`}
                  className="text-accent hover:underline"
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
