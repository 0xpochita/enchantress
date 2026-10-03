"use client";

import type { BridgeCatalog } from "@/features/bridge";
import { type Portfolio, usePortfolio } from "@/features/portfolio";
import { useSession } from "@/features/wallet";
import { ActivityTable } from "./ActivityTable";
import { DepositsSummary } from "./DepositsSummary";
import { EmptyCard, ErrorCard, LoadingCard } from "./PortfolioStates";
import { PortfolioTabs } from "./PortfolioTabs";
import { PositionsTable } from "./PositionsTable";
import { PurchaseHistory } from "./PurchaseHistory";
import { WalletBalances } from "./WalletBalances";
import { WalletHeader } from "./WalletHeader";

function IndexesSection({ portfolio }: { portfolio: Portfolio }) {
  if (portfolio.positions.length === 0)
    return (
      <EmptyCard
        title="No positions yet"
        href="/invest"
        action="Explore indexes"
      >
        Deposit into an index and your positions, earnings and history will
        appear here.
      </EmptyCard>
    );
  return (
    <>
      <DepositsSummary totals={portfolio.totals} series={portfolio.history} />
      <PositionsTable
        rows={portfolio.positions}
        totalUsd={portfolio.totals.valueUsd}
      />
    </>
  );
}

interface PanelProps {
  portfolio: Portfolio;
  catalog: BridgeCatalog;
}

function PositionsPanel({ portfolio, catalog }: PanelProps) {
  return (
    <>
      <h2 className="text-xl font-light tracking-tight">Indexes</h2>
      <IndexesSection portfolio={portfolio} />
      <h2 className="text-xl font-light tracking-tight">Wallet balances</h2>
      <WalletBalances prices={portfolio.prices} catalog={catalog} />
    </>
  );
}

function PortfolioBody({ catalog }: { catalog: BridgeCatalog }) {
  const portfolio = usePortfolio();
  if (portfolio.isPending) return <LoadingCard label="Loading portfolio" />;
  if (portfolio.isError)
    return (
      <ErrorCard
        message="We could not load your portfolio."
        onRetry={() => portfolio.refetch()}
      />
    );
  return (
    <PortfolioTabs
      panels={{
        Positions: (
          <PositionsPanel portfolio={portfolio.data} catalog={catalog} />
        ),
        Activity: (
          <div className="flex flex-col gap-6">
            <PurchaseHistory
              rows={portfolio.data.purchases}
              indexIcons={portfolio.data.indexIcons}
            />
            <ActivityTable
              rows={portfolio.data.activity}
              indexIcons={portfolio.data.indexIcons}
            />
          </div>
        ),
      }}
    />
  );
}

export function PortfolioView({ catalog }: { catalog: BridgeCatalog }) {
  const session = useSession();
  return (
    <>
      <WalletHeader />
      {session.isAuthenticated && <PortfolioBody catalog={catalog} />}
    </>
  );
}
