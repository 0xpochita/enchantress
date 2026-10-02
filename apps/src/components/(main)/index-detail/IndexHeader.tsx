import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { CryptoIcon, TokenStack } from "@/components/ui";
import type { VaultAsset, Venue } from "@/types/market";

interface IndexHeaderProps {
  name: string;
  assets: VaultAsset[];
  protocols: Venue[];
}

export function IndexHeader({ name, assets, protocols }: IndexHeaderProps) {
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
        <h1 className="flex-1 text-3xl font-light tracking-tight">{name}</h1>
        <ul aria-label="DeFi protocols" className="flex flex-wrap gap-2">
          {protocols.map((protocol) => (
            <li
              key={protocol.id}
              className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1 text-sm"
            >
              <CryptoIcon iconKey={protocol.iconKey} label="" size={22} />
              {protocol.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
