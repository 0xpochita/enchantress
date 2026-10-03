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

export interface ValuePoint {
  time: number;
  valueUsd: number;
}
