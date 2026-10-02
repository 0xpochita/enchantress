import { yearlyRewardsUsd } from "./yield-index.ts";

export interface PositionValue {
  valueUsd: number;
  apy: number;
}

export interface PortfolioSummary {
  investedUsd: number;
  netWorthUsd: number;
  apy: number;
  yearlyUsd: number;
}

export function summarizePortfolio(
  positions: PositionValue[],
  walletUsd: number,
): PortfolioSummary {
  const investedUsd = positions.reduce((sum, p) => sum + p.valueUsd, 0);
  const yearlyUsd = positions.reduce(
    (sum, p) => sum + yearlyRewardsUsd(p.valueUsd, p.apy),
    0,
  );
  return {
    investedUsd,
    netWorthUsd: investedUsd + walletUsd,
    apy: investedUsd > 0 ? (yearlyUsd / investedUsd) * 100 : 0,
    yearlyUsd,
  };
}

export interface DatedValue {
  timestamp: string;
  valueUsd: number;
}

export interface ValuePoint {
  time: number;
  valueUsd: number;
}

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function valueAt(
  deposits: DatedValue[],
  apy: number,
  time: number,
): number {
  return deposits.reduce((sum, deposit) => {
    const elapsed = time - Date.parse(deposit.timestamp);
    if (elapsed < 0) return sum;
    return sum + deposit.valueUsd * (1 + ((apy / 100) * elapsed) / YEAR_MS);
  }, 0);
}

export function valueSeries(
  deposits: DatedValue[],
  apy: number,
  untilIso: string,
  pointCount: number,
): ValuePoint[] {
  if (deposits.length === 0 || pointCount < 2) return [];
  const start = Math.min(...deposits.map((d) => Date.parse(d.timestamp)));
  const step = (Date.parse(untilIso) - start) / (pointCount - 1);
  return Array.from({ length: pointCount }, (_, position) => {
    const time = start + step * position;
    return { time, valueUsd: valueAt(deposits, apy, time) };
  });
}

export function accruedInterestUsd(
  deposits: DatedValue[],
  apy: number,
  asOfIso: string,
): number {
  const principal = deposits.reduce((sum, d) => sum + d.valueUsd, 0);
  return valueAt(deposits, apy, Date.parse(asOfIso)) - principal;
}
