import { Wallet } from "lucide-react";
import type { useTokenSearch } from "@/hooks/useTokenSearch";
import type { Chain, Token } from "@/types/market";
import { TokenRow } from "./TokenRow";

interface TokenSectionsProps {
  search: ReturnType<typeof useTokenSearch>;
  chainsById: Map<string, Chain>;
  selectedId?: string;
  onSelect: (token: Token) => void;
}

export function TokenSections({
  search,
  chainsById,
  selectedId,
  onSelect,
}: TokenSectionsProps) {
  if (search.visibleTokens.length === 0) {
    return (
      <p className="px-3 py-8 text-center text-sm text-ink-muted">
        No tokens match your search.
      </p>
    );
  }
  const rowProps = (token: Token) => ({
    token,
    chain: chainsById.get(token.chainId),
    isSelected: token.id === selectedId,
    onSelect,
  });
  return (
    <div className="flex flex-col gap-4">
      {search.ownedTokens.length > 0 && (
        <section aria-label="Your tokens" className="flex flex-col gap-1">
          <h3 className="flex items-center gap-2 px-3 text-sm font-medium text-accent">
            <Wallet aria-hidden className="size-4" />
            Your tokens
          </h3>
          {search.ownedTokens.map(({ token, amount }) => (
            <TokenRow key={token.id} amount={amount} {...rowProps(token)} />
          ))}
        </section>
      )}
      <section aria-label="All tokens" className="flex flex-col gap-1">
        <h3 className="px-3 text-sm font-medium text-ink-muted">All tokens</h3>
        {search.visibleTokens.map((token) => (
          <TokenRow key={token.id} {...rowProps(token)} />
        ))}
      </section>
    </div>
  );
}
