import "server-only";
import { monadToken } from "@/features/chain/config/tokens";
import { listIndexes } from "@/features/indexes/services/index-repository";
import { VENUE_CONFIGS } from "@/features/vaults/config/venues";
import { getVenueSnapshot } from "@/features/vaults/services/venue-snapshot";
import { summarizePortfolio } from "@/utils/portfolio";
import type {
  Portfolio,
  PortfolioActivity,
  PortfolioHolding,
  PortfolioPosition,
} from "../types";
import type { ValuedHolding } from "../utils/lots";
import {
  buildPositions,
  type IndexPosition,
  netInvestedByIndex,
} from "../utils/positions";
import { historySeries } from "../utils/snapshots";
import { userLedger, userLots, userSnapshots } from "./portfolio-repository";
import { valueLots } from "./valuation";

type LedgerRow = Awaited<ReturnType<typeof userLedger>>[number];
type IndexNames = Map<string, string>;

function toHolding(holding: ValuedHolding): PortfolioHolding {
  const venue = VENUE_CONFIGS.find((v) => v.id === holding.venueId);
  return {
    venueId: holding.venueId,
    venueName: venue?.name ?? holding.venueId,
    venueIconKey: venue?.iconKey ?? holding.venueId,
    assetSymbol: holding.assetSymbol,
    assetIconKey:
      monadToken(holding.assetSymbol)?.iconKey ?? holding.assetSymbol,
    amount: holding.amount,
    valueUsd: holding.valueUsd,
    apy: holding.apy,
  };
}

function toPosition(
  position: IndexPosition,
  names: IndexNames,
): PortfolioPosition {
  return {
    ...position,
    indexName: names.get(position.indexId) ?? position.indexId,
    holdings: position.holdings.map(toHolding),
  };
}

function toActivity(row: LedgerRow, names: IndexNames): PortfolioActivity {
  const token = monadToken(row.assetSymbol);
  return {
    id: row.id,
    indexId: row.indexId,
    indexName: names.get(row.indexId) ?? row.indexId,
    direction: row.direction === "out" ? "out" : "in",
    assetSymbol: row.assetSymbol,
    assetIconKey: token?.iconKey ?? row.assetSymbol,
    amount: Number(row.amountBase) / 10 ** (token?.decimals ?? 0),
    valueUsd: Number(row.valueUsd),
    txHash: row.txHash,
    at: row.at.toISOString(),
  };
}

function buildTotals(positions: IndexPosition[]): Portfolio["totals"] {
  const summary = summarizePortfolio(positions, 0);
  const costUsd = positions.reduce((sum, p) => sum + p.costUsd, 0);
  return {
    valueUsd: summary.investedUsd,
    costUsd,
    earnedUsd: summary.investedUsd - costUsd,
    apy: summary.apy,
    yearlyUsd: summary.yearlyUsd,
  };
}

export async function getPortfolio(userId: string): Promise<Portfolio> {
  const [lots, ledgerRows, snapshots, indexes, venues] = await Promise.all([
    userLots(userId),
    userLedger(userId),
    userSnapshots(userId),
    listIndexes(),
    getVenueSnapshot(),
  ]);
  const names: IndexNames = new Map(indexes.map((i) => [i.id, i.name]));
  const flows = ledgerRows.map((row) => toActivity(row, names));
  const positions = buildPositions(
    await valueLots(lots),
    netInvestedByIndex(flows),
  );
  const totals = buildTotals(positions);
  return {
    totals,
    positions: positions.map((p) => toPosition(p, names)),
    history: historySeries(snapshots, flows, {
      time: Date.now(),
      valueUsd: totals.valueUsd,
    }),
    activity: flows,
    prices: Object.fromEntries(
      venues.assets.map((a) => [a.symbol, a.priceUsd]),
    ),
  };
}
