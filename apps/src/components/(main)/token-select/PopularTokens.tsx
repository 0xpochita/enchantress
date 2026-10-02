import { CryptoIcon } from "@/components/ui";
import type { Chain, Token } from "@/types/market";

interface PopularTokensProps {
  tokens: Token[];
  chainsById: Map<string, Chain>;
  onSelect: (token: Token) => void;
}

export function PopularTokens({
  tokens,
  chainsById,
  onSelect,
}: PopularTokensProps) {
  return (
    <ul aria-label="Popular tokens" className="flex flex-wrap gap-2">
      {tokens.map((token) => (
        <li key={token.id}>
          <button
            type="button"
            onClick={() => onSelect(token)}
            className="flex flex-col items-center gap-1 rounded-md bg-surface-raised px-4 py-2 text-sm transition-colors duration-200 ease-out hover:bg-surface-hover"
          >
            <CryptoIcon
              iconKey={token.iconKey}
              label=""
              badgeIconKey={chainsById.get(token.chainId)?.iconKey}
              size={28}
            />
            {token.symbol}
          </button>
        </li>
      ))}
    </ul>
  );
}
