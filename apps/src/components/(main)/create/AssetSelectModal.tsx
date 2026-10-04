"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { buttonClassName, CryptoIcon, Modal } from "@/components/ui";
import type { VaultAsset, Venue } from "@/types/market";
import { formatPercent } from "@/utils/format";
import { assetMarkets, type BestMarket } from "@/utils/yield-index";
import { SearchInput } from "../token-select/SearchInput";

interface AssetSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: VaultAsset[];
  venues: Venue[];
  selectedSymbols: string[];
  matches: Record<string, Venue>;
  onToggle: (symbol: string) => void;
  onPickVenue: (symbol: string, venueId: string) => void;
}

function matches(asset: VaultAsset, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return (
    needle === "" ||
    `${asset.symbol} ${asset.name}`.toLowerCase().includes(needle)
  );
}

function AssetToggle({
  asset,
  isSelected,
  onToggle,
}: {
  asset: VaultAsset;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-200 hover:bg-surface-hover"
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
      <span
        className={`flex size-5 items-center justify-center rounded-full border ${isSelected ? "border-accent bg-accent text-accent-ink" : "border-line"}`}
      >
        {isSelected && <Check aria-hidden className="size-3" />}
      </span>
    </button>
  );
}

function VenueOption({
  symbol,
  market,
  isBest,
  isChecked,
  onPick,
}: {
  symbol: string;
  market: BestMarket;
  isBest: boolean;
  isChecked: boolean;
  onPick: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface py-1 pr-2.5 pl-1 text-xs text-ink-muted transition-colors duration-200 hover:border-ink-subtle has-checked:border-accent has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-accent">
      <input
        type="radio"
        name={`venue-${symbol}`}
        value={market.venue.id}
        checked={isChecked}
        onChange={onPick}
        className="sr-only"
      />
      <CryptoIcon iconKey={market.venue.iconKey} label="" size={18} />
      {market.venue.name}
      <span className="text-positive">{formatPercent(market.apy)}</span>
      {isBest && <span className="text-ink-subtle">Best</span>}
    </label>
  );
}

function VenueOptions({
  asset,
  venues,
  checkedVenueId,
  onPick,
}: {
  asset: VaultAsset;
  venues: Venue[];
  checkedVenueId?: string;
  onPick: (venueId: string) => void;
}) {
  const markets = assetMarkets(venues, asset.symbol);
  const checked = checkedVenueId ?? markets[0]?.venue.id;
  return (
    <fieldset className="flex flex-wrap gap-1.5 pr-3 pb-2.5 pl-15">
      <legend className="sr-only">Protocol for {asset.symbol}</legend>
      {markets.map((market, position) => (
        <VenueOption
          key={market.venue.id}
          symbol={asset.symbol}
          market={market}
          isBest={position === 0}
          isChecked={market.venue.id === checked}
          onPick={() => onPick(market.venue.id)}
        />
      ))}
    </fieldset>
  );
}

function AssetRow({
  isSelected,
  onToggle,
  ...options
}: {
  asset: VaultAsset;
  venues: Venue[];
  isSelected: boolean;
  checkedVenueId?: string;
  onToggle: () => void;
  onPick: (venueId: string) => void;
}) {
  return (
    <div className={`rounded-md ${isSelected ? "bg-surface-raised" : ""}`}>
      <AssetToggle
        asset={options.asset}
        isSelected={isSelected}
        onToggle={onToggle}
      />
      <VenueOptions {...options} />
    </div>
  );
}

export function AssetSelectModal({
  isOpen,
  onClose,
  assets,
  venues,
  selectedSymbols,
  matches: routedVenues,
  onToggle,
  onPickVenue,
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
                checkedVenueId={routedVenues[asset.symbol]?.id}
                onToggle={() => onToggle(asset.symbol)}
                onPick={(venueId) => onPickVenue(asset.symbol, venueId)}
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
