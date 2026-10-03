"use client";

import { useState } from "react";
import {
  type BridgeCatalog,
  useBridgeDeposit,
  useOriginBalances,
} from "@/features/bridge";
import { useSession } from "@/features/wallet";
import { useLastToken } from "@/hooks/useLastToken";

function useTokenBalance(tokenId: string) {
  const session = useSession();
  const balances = useOriginBalances();
  const isBalanceLoading = session.isAuthenticated && balances.isPending;
  const balance =
    session.isAuthenticated && !balances.isPending
      ? (balances.data?.find((b) => b.tokenId === tokenId)?.amount ?? 0)
      : undefined;
  return { balance, isBalanceLoading, balances: balances.data ?? [] };
}

export function useIndexTokenDeposit(
  indexId: string,
  catalog: BridgeCatalog,
  defaultTokenId: string,
) {
  const session = useSession();
  const [amount, setAmount] = useState("");
  const [tokenId, setTokenId] = useLastToken(
    defaultTokenId,
    catalog.tokens.map((t) => t.id),
  );
  const token =
    catalog.tokens.find((t) => t.id === tokenId) ?? catalog.tokens[0];
  const flow = useBridgeDeposit({ indexId, originTokenId: token.id, amount });
  const amountNumber = Number(amount) || 0;
  return {
    ...flow,
    ...useTokenBalance(token.id),
    catalog,
    token,
    tokenId: token.id,
    setTokenId,
    chain: catalog.chains.find((c) => c.id === token.chainId),
    isCrossChain: token.chainId !== "monad",
    amount,
    setAmount,
    amountNumber,
    valueUsd: amountNumber * token.priceUsd,
    isAuthenticated: session.isAuthenticated,
    login: session.login,
    finish: () => {
      flow.finish();
      setAmount("");
    },
  };
}

export type IndexTokenDeposit = ReturnType<typeof useIndexTokenDeposit>;
