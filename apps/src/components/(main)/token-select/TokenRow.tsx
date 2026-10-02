import { Check } from "lucide-react";
import { CryptoIcon } from "@/components/ui";
import type { Chain, Token } from "@/types/market";
import { formatAmount, formatUsd } from "@/utils/format";

interface TokenRowProps {
  token: Token;
  chain?: Chain;
  amount?: number;
  isSelected: boolean;
  onSelect: (token: Token) => void;
}

export function TokenRow({
  token,
  chain,
  amount,
  isSelected,
  onSelect,
}: TokenRowProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={() => onSelect(token)}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors duration-200 ease-out hover:bg-surface-raised"
    >
      <CryptoIcon
        iconKey={token.iconKey}
        label=""
        badgeIconKey={chain?.iconKey}
        size={36}
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{token.name}</span>
        <span className="truncate text-sm text-ink-muted">
          {token.symbol} · {chain?.name}
        </span>
      </span>
      {amount !== undefined && (
        <span className="flex flex-col items-end">
          <span>{formatAmount(amount)}</span>
          <span className="text-sm text-ink-muted">
            {formatUsd(amount * token.priceUsd)}
          </span>
        </span>
      )}
      {isSelected && (
        <Check aria-label="Selected" className="size-4 text-accent" />
      )}
    </button>
  );
}
