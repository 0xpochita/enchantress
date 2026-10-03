"use client";

import { Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { buttonClassName, CryptoIcon } from "@/components/ui";
import type { IndexDepositController } from "@/features/executions";
import type { Chain } from "@/types/market";
import { formatAmount, formatPercent, formatUsd } from "@/utils/format";
import { yearlyRewardsUsd } from "@/utils/yield-index";
import { RouteDetails } from "../routing/RouteDetails";

interface DepositBarProps {
  deposit: IndexDepositController;
  apy: number;
  sliceCount: number;
  chain?: Chain;
  header: ReactNode;
}

function BalanceLine({ deposit }: { deposit: IndexDepositController }) {
  if (!deposit.isAuthenticated) return null;
  const text = deposit.isBalanceLoading
    ? "Loading balance"
    : `${formatAmount(deposit.balance ?? 0)} ${deposit.token.symbol}`;
  return (
    <span className="flex items-center gap-2 px-1 text-xs text-ink-muted">
      <Wallet aria-hidden className="size-3.5" />
      {text}
      {deposit.balance !== undefined && deposit.balance > 0 && (
        <button
          type="button"
          onClick={() => deposit.setAmount(String(deposit.balance))}
          className="ml-auto text-brand hover:underline"
        >
          Max
        </button>
      )}
    </span>
  );
}

function submitLabel(deposit: IndexDepositController): string {
  if (!deposit.isAuthenticated) return "Log in to deposit";
  if (deposit.balance !== undefined && deposit.valueUsd > deposit.balance)
    return "Not enough USDC on Monad";
  return "Deposit";
}

export function DepositBar({
  deposit,
  apy,
  sliceCount,
  chain,
  header,
}: DepositBarProps) {
  const overBalance =
    deposit.balance !== undefined && deposit.valueUsd > deposit.balance;
  const isDisabled =
    deposit.isAuthenticated && (deposit.valueUsd <= 0 || overBalance);
  return (
    <div className="flex min-h-[22rem] flex-col gap-5 rounded-md bg-surface-raised p-5">
      {header}
      <div className="flex flex-col gap-2 px-1">
        <label htmlFor="index-amount" className="text-xs text-ink-muted">
          You deposit
        </label>
        <div className="flex min-w-0 items-center gap-3">
          <input
            id="index-amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={deposit.amount}
            onChange={(event) =>
              deposit.setAmount(event.target.value.replace(/[^0-9.]/g, ""))
            }
            className="w-full min-w-0 bg-transparent text-3xl font-light outline-none placeholder:text-ink-subtle"
          />
          <span className="flex shrink-0 items-center gap-2 rounded-full bg-surface py-1.5 pr-3.5 pl-1.5 font-medium">
            <CryptoIcon
              iconKey={deposit.token.iconKey}
              label=""
              badgeIconKey="monad"
              size={28}
            />
            {deposit.token.symbol}
          </span>
        </div>
      </div>
      <BalanceLine deposit={deposit} />
      <span className="px-1 text-xs text-ink-muted">
        ≈ {formatUsd(yearlyRewardsUsd(deposit.valueUsd, apy))}/yr at{" "}
        {formatPercent(apy)}
      </span>
      <div className="mt-auto flex flex-col gap-4">
        <RouteDetails chain={chain} sliceCount={sliceCount} />
        <button
          type="button"
          disabled={isDisabled}
          onClick={deposit.review}
          className={buttonClassName("primary", "w-full py-3 text-sm")}
        >
          {submitLabel(deposit)}
        </button>
      </div>
    </div>
  );
}
