import { useState } from "react";
import { useSubmitFlow } from "@/hooks/useSubmitFlow";
import type { Chain, Token } from "@/types/market";

export const DEPOSIT_ACTIONS = ["Deposit", "Withdraw"] as const;
export type DepositAction = (typeof DEPOSIT_ACTIONS)[number];

interface DepositSource {
  chains: Chain[];
  tokens: Token[];
  defaultTokenId: string;
}

export function useDepositAction({
  chains,
  tokens,
  defaultTokenId,
}: DepositSource) {
  const [action, setAction] = useState<DepositAction>("Deposit");
  const [amount, setAmount] = useState("");
  const [tokenId, setTokenId] = useState(defaultTokenId);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const token = tokens.find((t) => t.id === tokenId);
  const chain = chains.find((c) => c.id === token?.chainId);
  const valueUsd = (Number(amount) || 0) * (token?.priceUsd ?? 0);
  const flow = useSubmitFlow(() => setAmount(""));

  return {
    action,
    setAction,
    amount,
    setAmount,
    tokenId,
    setTokenId,
    token,
    chain,
    valueUsd,
    isPickerOpen,
    openPicker: () => setIsPickerOpen(true),
    closePicker: () => setIsPickerOpen(false),
    ...flow,
  };
}
