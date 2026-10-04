"use client";

import { ArrowRight, ChevronRight, Plus, X } from "lucide-react";
import { useState } from "react";
import { CryptoIcon, TokenStack } from "@/components/ui";
import type { VaultAsset, Venue } from "@/types/market";
import { AssetSelectModal } from "./AssetSelectModal";

interface AssetPickerProps {
  assets: VaultAsset[];
  venues: Venue[];
  selectedSymbols: string[];
  matches: Record<string, Venue>;
  onToggle: (symbol: string) => void;
  onPickVenue: (symbol: string, venueId: string) => void;
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

const TILE_PREVIEW_COUNT = 4;

function SelectAssetsTile({
  assets,
  onOpen,
}: {
  assets: VaultAsset[];
  onOpen: () => void;
}) {
  const preview = assets.slice(0, TILE_PREVIEW_COUNT).map((asset) => ({
    iconKey: asset.iconKey,
    label: asset.symbol,
  }));
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-3 rounded-md border border-dashed border-line bg-surface p-3 text-left transition-colors duration-200 hover:border-ink-subtle hover:bg-surface-hover"
    >
      <span className="flex size-9 flex-none items-center justify-center rounded-full bg-accent text-accent-ink">
        <Plus aria-hidden className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium text-ink">Select assets</span>
        <span className="text-xs text-ink-muted">
          {assets.length} tokens on Monad
        </span>
      </span>
      <TokenStack items={preview} size={22} />
      <ChevronRight
        aria-hidden
        className="size-4 text-ink-subtle transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </button>
  );
}

export function AssetPicker({
  assets,
  venues,
  selectedSymbols,
  matches,
  onToggle,
  onPickVenue,
}: AssetPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = assets.filter((asset) =>
    selectedSymbols.includes(asset.symbol),
  );
  return (
    <>
      {selected.length === 0 && (
        <SelectAssetsTile assets={assets} onOpen={() => setIsOpen(true)} />
      )}
      <ul aria-label="Selected assets" className="flex flex-wrap gap-2">
        {selected.map((asset) => (
          <SelectedChip
            key={asset.symbol}
            asset={asset}
            venue={matches[asset.symbol]}
            onRemove={() => onToggle(asset.symbol)}
          />
        ))}
        {selected.length > 0 && (
          <li>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className={`${CHIP} border-dashed px-3 text-ink-muted transition-colors duration-200 hover:border-ink-subtle hover:text-ink`}
            >
              <Plus aria-hidden className="size-4" />
              Add
            </button>
          </li>
        )}
      </ul>
      <AssetSelectModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        assets={assets}
        venues={venues}
        selectedSymbols={selectedSymbols}
        matches={matches}
        onToggle={onToggle}
        onPickVenue={onPickVenue}
      />
    </>
  );
}
