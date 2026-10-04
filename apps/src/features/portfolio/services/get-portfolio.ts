import "server-only";
import { getBridgeSource } from "@/features/bridge/services/bridge-catalog";
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
import { toAmount, type ValuedHolding } from "../utils/lots";
import {
  buildPositions,
  type IndexPosition,
  netInvestedByIndex,
} from "../utils/positions";
import {
  markCreations,
  type PurchaseLookups,
  toPurchase,
} from "../utils/purchases";
import { historySeries } from "../utils/snapshots";
import {
  userExecutions,
  userLedger,
  userLots,
  userSnapshots,
} from "./portfolio-repository";
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
    amount: toAmount(BigInt(row.amountBase), token?.decimals ?? 0),
    valueUsd: Number(row.valueUsd),
    txHash: row.txHash,
    viaAurora: row.originChain !== null,
    at: row.at.toISOString(),
  };
}

type Indexes = Awaited<ReturnType<typeof listIndexes>>;

function indexIcons(indexes: Indexes): Portfolio["indexIcons"] {
  return Object.fromEntries(
    indexes.map((index) => [
      index.id,
      index.allocations.map(({ assetSymbol }) => ({
        iconKey: monadToken(assetSymbol)?.iconKey ?? assetSymbol.toLowerCase(),
        label: assetSymbol,
      })),
    ]),
  );
}

function ownIndexIds(
  indexes: Indexes,
  walletAddress: string | null,
): Set<string> {
  const wallet = walletAddress?.toLowerCase();
  return new Set(
    indexes
      .filter((index) => wallet && index.creator.toLowerCase() === wallet)
      .map((index) => index.id),
  );
}

type BridgeSource = Awaited<ReturnType<typeof getBridgeSource>>;

function purchaseLookups(
  names: IndexNames,
  source: BridgeSource,
): PurchaseLookups {
  const iconFor = (symbol: string) =>
    source.catalog.tokens.find((t) => t.symbol === symbol)?.iconKey ??
    symbol.toLowerCase();
  return {
    indexName: (id) => names.get(id) ?? id,
    monadToken: (symbol) => monadToken(symbol),
    originToken: (assetId) => {
      const detail = source.details[assetId];
      return detail && { ...detail, iconKey: iconFor(detail.symbol) };
    },
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

export async function getPortfolio(
  userId: string,
  walletAddress: string | null,
): Promise<Portfolio> {
  const [lots, ledgerRows, snapshots, indexes, venues, runs, source] =
    await Promise.all([
      userLots(userId),
      userLedger(userId),
      userSnapshots(userId),
      listIndexes(),
      getVenueSnapshot(),
      userExecutions(userId),
      getBridgeSource(),
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
    purchases: markCreations(
      runs.map((run) => toPurchase(run, purchaseLookups(names, source))),
      ownIndexIds(indexes, walletAddress),
    ),
    indexIcons: indexIcons(indexes),
    prices: Object.fromEntries(
      venues.assets.map((a) => [a.symbol, a.priceUsd]),
    ),
  };
}
