import { ChevronDown } from "lucide-react";
import { CryptoIcon } from "@/components/ui";
import type { Chain, Token } from "@/types/market";

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
      <button
        type="button"
        onClick={onPickToken}
        className="flex shrink-0 items-center gap-2 rounded-full bg-surface-raised py-2 pr-3 pl-2 text-sm hover:bg-surface-hover"
      >
        {token && (
          <CryptoIcon
            iconKey={token.iconKey}
            label=""
            badgeIconKey={chain?.iconKey}
            size={24}
          />
        )}
        <span className="flex flex-col items-start leading-tight">
          <span>{token?.symbol ?? "Select"}</span>
          {chain && (
            <span className="text-xs text-ink-muted">{chain.name}</span>
          )}
        </span>
        <ChevronDown aria-hidden className="size-4 text-ink-muted" />
      </button>
    </div>
  );
}
