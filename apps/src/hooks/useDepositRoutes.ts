import { useMemo, useState } from "react";
import type { Chain, IndexQuote, Token, WalletBalance } from "@/types/market";
import { rankRoutes } from "@/utils/routes";

export const ALL_AGGREGATORS = "all";

interface DepositRoutesSource {
  chains: Chain[];
  tokens: Token[];
  balances: WalletBalance[];
  quotes: IndexQuote[];
  defaultTokenId: string;
}

const VAULT_CHAIN_ID = "monad";

export function useDepositRoutes(source: DepositRoutesSource) {
  const [tokenId, setTokenId] = useState(source.defaultTokenId);
  const [amount, setAmount] = useState("");
  const [aggregatorId, setAggregatorId] = useState(ALL_AGGREGATORS);
  const [selectedIndexId, setSelectedIndexId] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const derived = useMemo(() => {
    const token = source.tokens.find((t) => t.id === tokenId);
    const chain = source.chains.find((c) => c.id === token?.chainId);
    const balance =
      source.balances.find((b) => b.tokenId === tokenId)?.amount ?? 0;
    const amountValue = Number(amount) || 0;
    const amountUsd = amountValue * (token?.priceUsd ?? 0);
    const isCrossChain = chain?.id !== VAULT_CHAIN_ID;
    const quotes = source.quotes.filter(
      (q) =>
        aggregatorId === ALL_AGGREGATORS || q.aggregatorId === aggregatorId,
    );
    const candidates = quotes.map((q) => ({
      indexId: q.id,
      apy: q.apy,
      assetCount: q.assets.length,
    }));
    const routes = rankRoutes(candidates, amountUsd, isCrossChain);
    const selected =
      routes.find((r) => r.indexId === selectedIndexId) ?? routes[0];
    return {
      token,
      chain,
      balance,
      amountUsd,
      isCrossChain,
      routes,
      selected,
      isInsufficient: amountValue > balance,
    };
  }, [source, tokenId, amount, aggregatorId, selectedIndexId]);

  return {
    ...derived,
    tokenId,
    setTokenId,
    amount,
    setAmount,
    aggregatorId,
    setAggregatorId,
    selectIndex: setSelectedIndexId,
    isPickerOpen,
    isSubmitted,
    submit: () => setIsSubmitted(true),
    openPicker: () => setIsPickerOpen(true),
    closePicker: () => setIsPickerOpen(false),
  };
}

export type DepositRoutes = ReturnType<typeof useDepositRoutes>;
