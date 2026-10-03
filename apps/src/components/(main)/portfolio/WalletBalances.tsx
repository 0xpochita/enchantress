"use client";

import { useState } from "react";
import { Card, CryptoIcon } from "@/components/ui";
import { type BridgeCatalog, useOriginBalances } from "@/features/bridge";
import { monadToken } from "@/features/chain/config/tokens";
import { useWalletBalances } from "@/features/portfolio";
import {
  type ChainGroup,
  groupWalletRows,
} from "@/features/portfolio/utils/wallet-rows";
import { formatAmount, formatUsd } from "@/utils/format";
import { EmptyCard, ErrorCard, LoadingCard } from "./PortfolioStates";
import { WalletActions } from "./WalletActions";

interface WalletBalancesProps {
  prices: Record<string, number>;
  catalog: BridgeCatalog;
}

function ChainCard({ group }: { group: ChainGroup }) {
  const { chain, rows, totalUsd } = group;
  return (
    <Card>
      <div className="flex items-center gap-3 px-6 py-4">
        <CryptoIcon iconKey={chain.iconKey} label={chain.name} size={22} />
        <span className="flex-1 font-medium">{chain.name}</span>
        <span className="text-sm text-ink-muted tabular-nums">
          {formatUsd(totalUsd)}
        </span>
      </div>
      <ul className="text-sm">
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex items-center gap-3 border-t border-line px-6 py-3"
          >
            <CryptoIcon
              iconKey={row.iconKey}
              label={row.symbol}
              badgeIconKey={chain.iconKey}
            />
            <span className="flex-1">
              {formatAmount(row.amount)}{" "}
              <span className="text-ink-muted">{row.symbol}</span>
            </span>
            <span className="tabular-nums">{formatUsd(row.valueUsd)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const ALL = "all";

function ChainFilter({
  groups,
  chains,
  value,
  onChange,
}: {
  groups: ChainGroup[];
  chains: BridgeCatalog["chains"];
  value: string;
  onChange: (value: string) => void;
}) {
  const totalOf = (id: string) =>
    groups.find((g) => g.chain.id === id)?.totalUsd ?? 0;
  const options = [
    { id: ALL, name: "All chains", iconKey: null as string | null },
    ...chains,
  ];
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">Filter by chain</legend>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className="flex items-center gap-2 rounded-full border border-line px-3.5 py-1.5 text-sm text-ink-muted transition-colors duration-200 ease-out hover:text-ink aria-pressed:border-ink-subtle aria-pressed:bg-surface-raised aria-pressed:text-ink"
        >
          {option.iconKey && (
            <CryptoIcon iconKey={option.iconKey} label="" size={16} />
          )}
          {option.name}
          {option.id !== ALL && (
            <span className="tabular-nums text-ink-subtle">
              {formatUsd(totalOf(option.id))}
            </span>
          )}
        </button>
      ))}
    </fieldset>
  );
}

function ChainList({
  groups,
  chainId,
}: {
  groups: ChainGroup[];
  chainId: string;
}) {
  const shown =
    chainId === ALL ? groups : groups.filter((g) => g.chain.id === chainId);
  if (shown.length === 0)
    return (
      <Card className="p-6 text-sm text-ink-muted">
        No tokens on this chain yet.
      </Card>
    );
  return (
    <div className="flex flex-col gap-4">
      {shown.map((group) => (
        <ChainCard key={group.chain.id} group={group} />
      ))}
    </div>
  );
}

function useWalletGroups({ prices, catalog }: WalletBalancesProps) {
  const monad = useWalletBalances();
  const origin = useOriginBalances();
  const groups = groupWalletRows({
    monad: monad.data ?? [],
    origin: origin.data ?? [],
    chains: catalog.chains,
    tokens: catalog.tokens,
    prices,
    monadMeta: (symbol) => {
      const token = monadToken(symbol);
      return {
        iconKey: token?.iconKey ?? symbol.toLowerCase(),
        address: token?.address ?? null,
        decimals: token?.decimals ?? 18,
      };
    },
  });
  const retry = () => Promise.all([monad.refetch(), origin.refetch()]);
  return {
    groups,
    isPending: monad.isPending || origin.isPending,
    isError: monad.isError && origin.isError,
    retry,
  };
}

export function WalletBalances(props: WalletBalancesProps) {
  const wallet = useWalletGroups(props);
  const [chainId, setChainId] = useState(ALL);
  if (wallet.isPending) return <LoadingCard label="Loading wallet" />;
  if (wallet.isError)
    return (
      <ErrorCard
        message="We could not read your wallet balances."
        onRetry={wallet.retry}
      />
    );
  const actions = (
    <WalletActions groups={wallet.groups} chains={props.catalog.chains} />
  );
  if (wallet.groups.length === 0)
    return (
      <div className="flex flex-col gap-4">
        {actions}
        <EmptyCard
          title="Your wallet is empty"
          href="/deposit"
          action="Deposit"
        >
          Add funds from Monad, Base, Ethereum or Arbitrum to start earning.
        </EmptyCard>
      </div>
    );
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ChainFilter
          groups={wallet.groups}
          chains={props.catalog.chains}
          value={chainId}
          onChange={setChainId}
        />
        {actions}
      </div>
      <ChainList groups={wallet.groups} chainId={chainId} />
    </div>
  );
}
