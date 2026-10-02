import { useMemo, useState } from "react";
import type { Chain, Token, WalletBalance } from "@/types/market";

export interface TokenWithBalance {
  token: Token;
  amount: number;
}

interface TokenSearchSource {
  chains: Chain[];
  tokens: Token[];
  balances: WalletBalance[];
}

function matches(query: string, ...fields: string[]): boolean {
  const needle = query.trim().toLowerCase();
  return needle === "" || fields.some((f) => f.toLowerCase().includes(needle));
}

function toOwned(
  tokens: Token[],
  balances: WalletBalance[],
): TokenWithBalance[] {
  return balances.flatMap(({ tokenId, amount }) => {
    const token = tokens.find((t) => t.id === tokenId);
    return token ? [{ token, amount }] : [];
  });
}

export function useTokenSearch({
  chains,
  tokens,
  balances,
}: TokenSearchSource) {
  const [chainQuery, setChainQuery] = useState("");
  const [tokenQuery, setTokenQuery] = useState("");
  const [chainId, setChainId] = useState<string | null>(null);

  const visibleChains = useMemo(
    () => chains.filter((chain) => matches(chainQuery, chain.name)),
    [chains, chainQuery],
  );

  const visibleTokens = useMemo(
    () =>
      tokens.filter(
        (token) =>
          (chainId === null || token.chainId === chainId) &&
          matches(tokenQuery, token.symbol, token.name),
      ),
    [tokens, chainId, tokenQuery],
  );

  const ownedTokens = useMemo(() => {
    const visibleIds = new Set(visibleTokens.map((t) => t.id));
    return toOwned(tokens, balances).filter(({ token }) =>
      visibleIds.has(token.id),
    );
  }, [tokens, balances, visibleTokens]);

  return {
    chainQuery,
    setChainQuery,
    tokenQuery,
    setTokenQuery,
    chainId,
    setChainId,
    visibleChains,
    visibleTokens,
    ownedTokens,
  };
}
