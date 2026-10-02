import { useState } from "react";
import type { Chain, Token } from "@/types/market";
import { formatUsd } from "@/utils/format";

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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const token = tokens.find((t) => t.id === tokenId);
  const chain = chains.find((c) => c.id === token?.chainId);
  const valueUsd = (Number(amount) || 0) * (token?.priceUsd ?? 0);
  const submit = () =>
    setStatusMessage(
      `${action} of ${formatUsd(valueUsd)} queued. Mock data, nothing was sent onchain.`,
    );

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
    statusMessage,
    submit,
  };
}
