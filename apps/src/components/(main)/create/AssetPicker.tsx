import { CryptoIcon } from "@/components/ui";
import type { VaultAsset } from "@/types/market";

interface AssetPickerProps {
  assets: VaultAsset[];
  selectedSymbols: string[];
  onToggle: (symbol: string) => void;
}

export function AssetPicker({
  assets,
  selectedSymbols,
  onToggle,
}: AssetPickerProps) {
  return (
    <>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Index assets</legend>
        {assets.map((asset) => (
          <button
            key={asset.symbol}
            type="button"
            aria-pressed={selectedSymbols.includes(asset.symbol)}
            onClick={() => onToggle(asset.symbol)}
            className="flex items-center gap-2 rounded-full border border-line bg-canvas py-1 pr-3 pl-1 text-sm transition-colors duration-200 ease-out hover:bg-surface-raised aria-pressed:border-accent aria-pressed:bg-surface-raised"
          >
            <CryptoIcon iconKey={asset.iconKey} label="" size={24} />
            {asset.symbol}
          </button>
        ))}
      </fieldset>
      <p className="text-xs text-ink-subtle">
        Assets live on Monad. Each one is routed to the best paying vault in the
        selected aggregator.
      </p>
    </>
  );
}
