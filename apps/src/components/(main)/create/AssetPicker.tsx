"use client";

import { ArrowRight, Plus, X } from "lucide-react";
import { useState } from "react";
import { CryptoIcon } from "@/components/ui";
import type { VaultAsset, Venue } from "@/types/market";
import { AssetSelectModal } from "./AssetSelectModal";

interface AssetPickerProps {
  assets: VaultAsset[];
  venues: Venue[];
  selectedSymbols: string[];
  matches: Record<string, Venue>;
  onToggle: (symbol: string) => void;
}

const CHIP =
  "flex items-center gap-2 rounded-full border border-line bg-surface py-1 text-sm";

function SelectedChip({
  asset,
  venue,
  onRemove,
}: {
  asset: VaultAsset;
  venue?: Venue;
  onRemove: () => void;
}) {
  return (
    <li className={`${CHIP} pr-1 pl-1`}>
      <CryptoIcon iconKey={asset.iconKey} label="" size={22} />
      {asset.symbol}
      {venue && (
        <span
          className="flex items-center gap-1 text-ink-subtle"
          title={`Routed to ${venue.name}`}
        >
          <ArrowRight aria-hidden className="size-3" />
          <CryptoIcon iconKey={venue.iconKey} label={venue.name} size={16} />
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${asset.symbol}`}
        className="rounded-full p-1 text-ink-subtle hover:bg-surface-hover hover:text-ink"
      >
        <X aria-hidden className="size-3" />
      </button>
    </li>
  );
}

export function AssetPicker({
  assets,
  venues,
  selectedSymbols,
  matches,
  onToggle,
}: AssetPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = assets.filter((asset) =>
    selectedSymbols.includes(asset.symbol),
  );
  return (
    <>
      <ul aria-label="Selected assets" className="flex flex-wrap gap-2">
        {selected.map((asset) => (
          <SelectedChip
            key={asset.symbol}
            asset={asset}
            venue={matches[asset.symbol]}
            onRemove={() => onToggle(asset.symbol)}
          />
        ))}
        <li>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 rounded-full border-2 border-dashed border-ink-subtle/50 px-3 py-2 text-base text-ink-muted transition-colors duration-200 hover:border-ink-subtle hover:bg-surface-hover hover:text-ink"
          >
            <Plus aria-hidden className="size-5" />
            {selected.length === 0 ? "Select assets" : "Add"}
          </button>
        </li>
      </ul>
      <AssetSelectModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        assets={assets}
        venues={venues}
        selectedSymbols={selectedSymbols}
        onToggle={onToggle}
      />
    </>
  );
}
