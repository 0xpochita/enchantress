import { Layers } from "lucide-react";
import { CryptoIcon } from "@/components/ui";
import type { Chain } from "@/types/market";

interface ChainListProps {
  chains: Chain[];
  activeId: string | null;
  onSelect: (chainId: string | null) => void;
}

const ITEM =
  "flex w-full items-center gap-3 rounded-full px-3 py-2 text-left text-sm transition-colors duration-200 ease-out hover:bg-surface-raised aria-pressed:bg-surface-hover";

export function ChainList({ chains, activeId, onSelect }: ChainListProps) {
  return (
    <ul className="flex flex-col gap-1">
      <li>
        <button
          type="button"
          aria-pressed={activeId === null}
          onClick={() => onSelect(null)}
          className={ITEM}
        >
          <Layers aria-hidden className="size-6 text-accent" />
          All networks
        </button>
      </li>
      {chains.map((chain) => (
        <li key={chain.id}>
          <button
            type="button"
            aria-pressed={activeId === chain.id}
            onClick={() => onSelect(chain.id)}
            className={ITEM}
          >
            <CryptoIcon iconKey={chain.iconKey} label="" size={24} />
            {chain.name}
          </button>
        </li>
      ))}
    </ul>
  );
}
