import { ArrowDown, ChevronRight, Wallet } from "lucide-react";
import Link from "next/link";
import { buttonClassName, Card, CryptoIcon, TokenStack } from "@/components/ui";
import type { DepositRoutes } from "@/hooks/useDepositRoutes";
import type { BasketQuote } from "@/types/market";
import { formatAmount, formatPercent, formatUsd } from "@/utils/format";

interface DepositFormProps {
  deposit: DepositRoutes;
  quote?: BasketQuote;
}

const BOX = "flex flex-col gap-4 rounded-lg bg-surface-raised p-5";

export function DepositForm({ deposit, quote }: DepositFormProps) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <SellBox deposit={deposit} />
      <span className="relative z-1 mx-auto -my-5 rounded-full border-4 border-surface bg-surface-raised p-2">
        <ArrowDown aria-hidden className="size-4 text-ink-muted" />
      </span>
      <EarnBox deposit={deposit} quote={quote} />
      <SubmitRow deposit={deposit} quote={quote} />
    </Card>
  );
}

function SellBox({ deposit }: { deposit: DepositRoutes }) {
  const { token, chain } = deposit;
  return (
    <div className={`${BOX} border border-line focus-within:border-accent`}>
      <label htmlFor="aggregator-amount" className="font-medium">
        Deposit
      </label>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={deposit.openPicker}
          className="flex shrink-0 items-center gap-2 rounded-full border border-line py-2 pr-3 pl-2 hover:bg-surface-hover"
        >
          {token && (
            <CryptoIcon
              iconKey={token.iconKey}
              label=""
              badgeIconKey={chain?.iconKey}
              size={28}
            />
          )}
          <span className="flex flex-col items-start leading-tight">
            <span>{token?.symbol ?? "Select"}</span>
            {chain && (
              <span className="text-xs text-ink-muted">{chain.name}</span>
            )}
          </span>
          <ChevronRight aria-hidden className="size-4 text-ink-muted" />
        </button>
        <input
          id="aggregator-amount"
          inputMode="decimal"
          placeholder="0"
          value={deposit.amount}
          onChange={(e) =>
            deposit.setAmount(e.target.value.replace(/[^0-9.]/g, ""))
          }
          className="w-full min-w-0 bg-transparent text-right text-4xl font-medium outline-none placeholder:text-ink-subtle"
        />
      </div>
      <div className="flex justify-between text-sm">
        <span
          className={`flex items-center gap-2 ${deposit.isInsufficient ? "text-negative" : "text-ink-muted"}`}
        >
          <Wallet aria-hidden className="size-4" />
          {formatAmount(deposit.balance)} {token?.symbol}
        </span>
        <span className="text-ink-muted">~{formatUsd(deposit.amountUsd)}</span>
      </div>
    </div>
  );
}

function EarnBox({ deposit, quote }: DepositFormProps) {
  return (
    <div className={BOX}>
      <span className="font-medium">Earn</span>
      <div className="flex items-center gap-4">
        {quote ? (
          <Link
            href={`/baskets/${quote.id}`}
            className="flex shrink-0 items-center gap-2 rounded-full border border-line py-2 pr-3 pl-2 hover:bg-surface-hover"
          >
            <TokenStack
              items={quote.assets.map((a) => ({
                iconKey: a.iconKey,
                label: a.symbol,
              }))}
              size={24}
            />
            {quote.name}
            <ChevronRight aria-hidden className="size-4 text-ink-muted" />
          </Link>
        ) : (
          <span className="text-ink-subtle">No basket available</span>
        )}
        <span className="ml-auto text-right text-4xl font-medium">
          {formatUsd(deposit.selected?.yearlyUsd ?? 0)}
        </span>
      </div>
      <div className="flex justify-between text-sm text-ink-muted">
        <span>{quote?.aggregatorName}</span>
        <span>per year at {formatPercent(deposit.selected?.apy ?? 0)}</span>
      </div>
    </div>
  );
}

function SubmitRow({ deposit, quote }: DepositFormProps) {
  const isDisabled = !quote || deposit.amountUsd <= 0 || deposit.isInsufficient;
  const label = deposit.isInsufficient
    ? "Insufficient funds"
    : `Deposit ${formatUsd(deposit.amountUsd)}`;
  return (
    <div className="flex flex-col gap-3 pt-2">
      <p className="flex justify-between px-1 text-sm text-ink-muted">
        <span>
          {deposit.isCrossChain
            ? `${deposit.chain?.name} to Monad via Aurora Intents`
            : "Already on Monad"}
        </span>
        <span>fee ~{formatUsd(deposit.selected?.feeUsd ?? 0)}</span>
      </p>
      <button
        type="button"
        disabled={isDisabled}
        onClick={deposit.submit}
        className={buttonClassName("primary", "w-full py-3")}
      >
        {label}
      </button>
      {deposit.isSubmitted && (
        <output className="text-sm text-positive">
          Deposit queued. Mock data, nothing was sent onchain.
        </output>
      )}
    </div>
  );
}
