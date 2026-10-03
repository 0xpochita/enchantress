"use client";

import { Card, CryptoIcon } from "@/components/ui";
import { monadToken } from "@/features/chain/config/tokens";
import { useWalletBalances } from "@/features/portfolio";
import { formatAmount, formatUsd } from "@/utils/format";
import { EmptyCard, ErrorCard, LoadingCard } from "./PortfolioStates";

interface BalanceRow {
  symbol: string;
  amount: number;
  valueUsd: number;
}

function BalanceItem({ row }: { row: BalanceRow }) {
  const iconKey = monadToken(row.symbol)?.iconKey ?? row.symbol;
  return (
    <li className="flex items-center gap-3 border-t border-line px-6 py-4 first:border-t-0">
      <CryptoIcon iconKey={iconKey} label={row.symbol} badgeIconKey="monad" />
      <span className="flex-1">
        {formatAmount(row.amount)}{" "}
        <span className="text-ink-muted">{row.symbol}</span>
      </span>
      <span className="tabular-nums">{formatUsd(row.valueUsd)}</span>
    </li>
  );
}

export function WalletBalances({ prices }: { prices: Record<string, number> }) {
  const balances = useWalletBalances();
  if (balances.isPending) return <LoadingCard label="Loading wallet" />;
  if (balances.isError)
    return (
      <ErrorCard
        message="We could not read your wallet balances."
        onRetry={() => balances.refetch()}
      />
    );
  const rows = balances.data
    .filter((b) => b.amount > 0)
    .map((b) => ({ ...b, valueUsd: b.amount * (prices[b.symbol] ?? 0) }));
  if (rows.length === 0)
    return (
      <EmptyCard title="Your wallet is empty" href="/deposit" action="Deposit">
        Add funds from Monad, Base, Ethereum or Arbitrum to start earning.
      </EmptyCard>
    );
  return (
    <Card>
      <ul className="text-sm">
        {rows.map((row) => (
          <BalanceItem key={row.symbol} row={row} />
        ))}
      </ul>
    </Card>
  );
}
