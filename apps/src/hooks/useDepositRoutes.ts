"use client";

import { useMemo, useState } from "react";
import type { Chain, IndexQuote, Token, WalletBalance } from "@/types/market";
import { rankRoutes } from "@/utils/routes";

export const ALL_VENUES = "all";

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
  const [venueId, setVenueId] = useState(ALL_VENUES);
  const [selectedIndexId, setSelectedIndexId] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const derived = useMemo(() => {
    const token = source.tokens.find((t) => t.id === tokenId);
    const chain = source.chains.find((c) => c.id === token?.chainId);
    const balance =
      source.balances.find((b) => b.tokenId === tokenId)?.amount ?? 0;
    const amountValue = Number(amount) || 0;
    const amountUsd = amountValue * (token?.priceUsd ?? 0);
    const isCrossChain = chain?.id !== VAULT_CHAIN_ID;
    const quotes = source.quotes.filter(
      (q) => venueId === ALL_VENUES || q.venues.some((v) => v.id === venueId),
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
  }, [source, tokenId, amount, venueId, selectedIndexId]);

  return {
    ...derived,
    tokenId,
    setTokenId,
    amount,
    setAmount,
    venueId,
    setVenueId,
    selectIndex: setSelectedIndexId,
    isPickerOpen,
    openPicker: () => setIsPickerOpen(true),
    closePicker: () => setIsPickerOpen(false),
  };
}

export type DepositRoutes = ReturnType<typeof useDepositRoutes>;
