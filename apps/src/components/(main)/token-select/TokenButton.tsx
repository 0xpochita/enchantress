import { ChevronDown } from "lucide-react";
import { CryptoIcon } from "@/components/ui";
import type { Chain, Token } from "@/types/market";

interface TokenButtonProps {
  token?: Token;
  chain?: Chain;
  onClick: () => void;
}

export function TokenButton({ token, chain, onClick }: TokenButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        token
          ? `Change token, ${token.symbol} on ${chain?.name}`
          : "Select token"
      }
      className="flex shrink-0 items-center gap-2 rounded-full bg-surface py-1.5 pr-2.5 pl-1.5 text-sm shadow-sm ring-1 ring-line transition-colors duration-200 ease-out hover:bg-surface-hover"
    >
      {token && (
        <CryptoIcon
          iconKey={token.iconKey}
          label=""
          badgeIconKey={chain?.iconKey}
          size={22}
        />
      )}
      <span className="font-medium">{token?.symbol ?? "Select"}</span>
      <ChevronDown aria-hidden className="size-3.5 text-ink-subtle" />
    </button>
  );
}
