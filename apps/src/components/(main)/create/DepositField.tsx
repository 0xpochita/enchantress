import type { Chain, Token } from "@/types/market";
import { TokenButton } from "../token-select/TokenButton";

interface DepositFieldProps {
  id: string;
  amount: string;
  onAmountChange: (amount: string) => void;
  token?: Token;
  chain?: Chain;
  onPickToken: () => void;
}

export function DepositField({
  id,
  amount,
  onAmountChange,
  token,
  chain,
  onPickToken,
}: DepositFieldProps) {
  return (
    <div className="flex items-center gap-4">
      <input
        id={id}
        inputMode="decimal"
        placeholder="0.00"
        value={amount}
        onChange={(event) =>
          onAmountChange(event.target.value.replace(/[^0-9.]/g, ""))
        }
        className="w-full min-w-0 bg-transparent text-4xl font-medium outline-none placeholder:text-ink-subtle"
      />
      <TokenButton token={token} chain={chain} onClick={onPickToken} />
    </div>
  );
}
