"use client";

import type { ReactNode } from "react";
import { buttonClassName, CryptoIcon, SegmentedControl } from "@/components/ui";
import { monadToken } from "@/features/chain/config/tokens";
import {
  type IndexWithdrawController,
  WITHDRAW_CHOICES,
} from "@/features/executions";
import { formatAmount, formatUsd } from "@/utils/format";

interface WithdrawBarProps {
  withdraw: IndexWithdrawController;
  header: ReactNode;
}

function PositionValue({ withdraw }: { withdraw: IndexWithdrawController }) {
  if (!withdraw.isAuthenticated || withdraw.isPositionLoading)
    return (
      <span className="text-sm text-ink-muted">
        {withdraw.isAuthenticated
          ? "Loading position"
          : "Log in to see your position"}
      </span>
    );
  return (
    <span className="text-3xl font-light">
      {formatUsd(withdraw.positionUsd)}
    </span>
  );
}

function submitLabel(withdraw: IndexWithdrawController): string {
  if (!withdraw.isAuthenticated) return "Log in to withdraw";
  if (!withdraw.isPositionLoading && withdraw.positionUsd <= 0)
    return "Nothing to withdraw";
  return withdraw.choice === "Max"
    ? "Withdraw all"
    : `Withdraw ${withdraw.choice}`;
}

function ReceiveList({ withdraw }: { withdraw: IndexWithdrawController }) {
  if (withdraw.holdings.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2 px-1 text-sm">
      {withdraw.holdings.map((holding) => (
        <li
          key={`${holding.venueId}-${holding.assetSymbol}`}
          className="flex items-center gap-2"
        >
          <CryptoIcon
            iconKey={monadToken(holding.assetSymbol)?.iconKey ?? "usdc"}
            label=""
            badgeIconKey="monad"
            size={22}
          />
          {formatAmount(holding.amount * withdraw.fraction)}{" "}
          {holding.assetSymbol}
          <span className="ml-auto text-xs text-ink-muted tabular-nums">
            {formatUsd(holding.valueUsd * withdraw.fraction)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function WithdrawBar({ withdraw, header }: WithdrawBarProps) {
  const isDisabled = withdraw.isAuthenticated && withdraw.positionUsd <= 0;
  return (
    <div className="flex min-h-[22rem] flex-col gap-5 rounded-md bg-surface-raised p-5">
      {header}
      <div className="flex flex-col gap-1 px-1">
        <span className="text-xs text-ink-muted">Your position</span>
        <PositionValue withdraw={withdraw} />
      </div>
      <div className="rounded-full bg-surface p-0.5">
        <SegmentedControl
          label="Amount to withdraw"
          options={WITHDRAW_CHOICES}
          value={withdraw.choice}
          onChange={withdraw.setChoice}
        />
      </div>
      <ReceiveList withdraw={withdraw} />
      <div className="mt-auto flex flex-col gap-4">
        <p className="px-1 text-xs text-ink-subtle">
          Withdrawn assets land in your Monad wallet. Gas is paid by
          Enchantress.
        </p>
        <button
          type="button"
          disabled={isDisabled}
          onClick={withdraw.review}
          className={buttonClassName("primary", "w-full py-3 text-sm")}
        >
          {submitLabel(withdraw)}
        </button>
      </div>
    </div>
  );
}
