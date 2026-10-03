import { summarizePortfolio } from "../../../utils/portfolio.ts";
import type { ValuedHolding } from "./lots.ts";

export interface LedgerFlow {
  indexId: string;
  direction: "in" | "out";
  valueUsd: number;
}

export interface IndexPosition {
  indexId: string;
  valueUsd: number;
  costUsd: number;
  earnedUsd: number;
  apy: number;
  holdings: ValuedHolding[];
}

export function netInvestedByIndex(flows: LedgerFlow[]): Map<string, number> {
  const invested = new Map<string, number>();
  for (const flow of flows) {
    const signed = flow.direction === "in" ? flow.valueUsd : -flow.valueUsd;
    invested.set(flow.indexId, (invested.get(flow.indexId) ?? 0) + signed);
  }
  return invested;
}

function groupByIndex(holdings: ValuedHolding[]): Map<string, ValuedHolding[]> {
  const groups = new Map<string, ValuedHolding[]>();
  for (const holding of holdings)
    groups.set(holding.indexId, [
      ...(groups.get(holding.indexId) ?? []),
      holding,
    ]);
  return groups;
}

export function buildPositions(
  holdings: ValuedHolding[],
  invested: Map<string, number>,
): IndexPosition[] {
  return [...groupByIndex(holdings)]
    .map(([indexId, items]) => {
      const { investedUsd, apy } = summarizePortfolio(items, 0);
      const costUsd = invested.get(indexId) ?? 0;
      return {
        indexId,
        valueUsd: investedUsd,
        costUsd,
        earnedUsd: investedUsd - costUsd,
        apy,
        holdings: items,
      };
    })
    .sort((a, b) => b.valueUsd - a.valueUsd);
}
