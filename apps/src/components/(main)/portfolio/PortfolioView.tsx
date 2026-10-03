import {
  getPositions,
  getUserPurchases,
  PORTFOLIO_AS_OF,
  type PortfolioPosition,
} from "@/lib/market";
import type { IndexTransaction } from "@/types/market";
import {
  accruedInterestUsd,
  summarizePortfolio,
  valueSeries,
} from "@/utils/portfolio";
import {
  type IndexLabel,
  TransactionHistory,
} from "../index-detail/TransactionHistory";
import { DepositsSummary } from "./DepositsSummary";
import { PortfolioTabs } from "./PortfolioTabs";
import { type PositionRowData, PositionsTable } from "./PositionsTable";
import { WalletHeader } from "./WalletHeader";

const CHART_POINTS = 60;

function indexLabels(positions: PortfolioPosition[]) {
  const labels: Record<string, IndexLabel> = {};
  for (const { index, allocations } of positions) {
    const venues = new Map(allocations.map((a) => [a.venue.id, a.venue]));
    labels[index.id] = { name: index.name, protocols: [...venues.values()] };
  }
  return labels;
}

function positionRows(
  positions: PortfolioPosition[],
  purchases: IndexTransaction[],
): PositionRowData[] {
  return positions.map((position) => ({
    ...position,
    earnedUsd: accruedInterestUsd(
      purchases.filter((tx) => tx.indexId === position.index.id),
      position.apy,
      PORTFOLIO_AS_OF,
    ),
  }));
}

function PositionsPanel({
  positions,
  purchases,
}: {
  positions: PortfolioPosition[];
  purchases: IndexTransaction[];
}) {
  const summary = summarizePortfolio(
    positions.map((p) => ({ valueUsd: p.index.positionUsd, apy: p.apy })),
    0,
  );
  const series = valueSeries(
    purchases,
    summary.apy,
    PORTFOLIO_AS_OF,
    CHART_POINTS,
  );
  return (
    <>
      <h2 className="text-xl font-light tracking-tight">Indexes</h2>
      <DepositsSummary summary={summary} series={series} />
      <PositionsTable
        rows={positionRows(positions, purchases)}
        investedUsd={summary.investedUsd}
      />
    </>
  );
}

export async function PortfolioView() {
  const positions = await getPositions();
  const purchases = getUserPurchases();
  return (
    <>
      <WalletHeader />
      <PortfolioTabs
        panels={{
          Positions: (
            <PositionsPanel positions={positions} purchases={purchases} />
          ),
          Activity: (
            <TransactionHistory
              transactions={purchases}
              indexes={indexLabels(positions)}
            />
          ),
        }}
      />
    </>
  );
}
