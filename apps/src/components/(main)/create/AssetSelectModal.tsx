"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { buttonClassName, CryptoIcon, Modal } from "@/components/ui";
import type { VaultAsset, Venue } from "@/types/market";
import { formatPercent } from "@/utils/format";
import { findBestMarket } from "@/utils/yield-index";
import { SearchInput } from "../token-select/SearchInput";

interface AssetSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: VaultAsset[];
  venues: Venue[];
  selectedSymbols: string[];
  onToggle: (symbol: string) => void;
}

function matches(asset: VaultAsset, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return (
    needle === "" ||
    `${asset.symbol} ${asset.name}`.toLowerCase().includes(needle)
  );
}

function AssetRow({
  asset,
  venues,
  isSelected,
  onToggle,
}: {
  asset: VaultAsset;
  venues: Venue[];
  isSelected: boolean;
  onToggle: () => void;
}) {
  const best = findBestMarket(venues, asset.symbol);
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-200 hover:bg-surface-raised aria-pressed:bg-surface-raised"
    >
      <CryptoIcon
        iconKey={asset.iconKey}
        label=""
        badgeIconKey="monad"
        size={36}
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{asset.symbol}</span>
        <span className="truncate text-sm text-ink-muted">{asset.name}</span>
      </span>
      {best && (
        <span className="flex items-center gap-1.5 text-xs text-ink-muted">
          <CryptoIcon iconKey={best.venue.iconKey} label="" size={16} />
          {best.venue.name}
          <span className="text-positive">up to {formatPercent(best.apy)}</span>
        </span>
      )}
      <span
        className={`flex size-5 items-center justify-center rounded-full border ${isSelected ? "border-accent bg-accent text-accent-ink" : "border-line"}`}
      >
        {isSelected && <Check aria-hidden className="size-3" />}
      </span>
    </button>
  );
}

export function AssetSelectModal({
  isOpen,
  onClose,
  assets,
  venues,
  selectedSymbols,
  onToggle,
}: AssetSelectModalProps) {
  const [query, setQuery] = useState("");
  const visible = assets.filter((asset) => matches(asset, query));
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      label="Select assets on Monad"
      size="md"
    >
      <div className="flex max-h-[min(36rem,85vh)] flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <h2 className="flex-1 text-sm font-medium">Select assets on Monad</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 hover:bg-surface-raised"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <SearchInput label="Search assets" value={query} onChange={setQuery} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-ink-muted">
              No assets match your search.
            </p>
          ) : (
            visible.map((asset) => (
              <AssetRow
                key={asset.symbol}
                asset={asset}
                venues={venues}
                isSelected={selectedSymbols.includes(asset.symbol)}
                onToggle={() => onToggle(asset.symbol)}
              />
            ))
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className={buttonClassName("primary", "w-full py-3 text-sm")}
        >
          Done ({selectedSymbols.length} selected)
        </button>
      </div>
    </Modal>
  );
}
