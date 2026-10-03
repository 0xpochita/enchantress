import type { ValuePoint } from "../../../utils/portfolio.ts";
import type { IndexPosition } from "./positions.ts";

const CENTS = 100;
const DAY_LENGTH = 10;

export interface SnapshotRow {
  userId: string;
  takenAt: string;
  totalValueUsd: string;
  byIndex: Record<string, number>;
}

export interface StoredSnapshot {
  takenAt: string;
  totalValueUsd: number;
}

export interface DatedFlow {
  at: string;
  direction: "in" | "out";
  valueUsd: number;
}

function roundCents(value: number): number {
  return Math.round(value * CENTS) / CENTS;
}

export function snapshotDate(now: Date): string {
  return now.toISOString().slice(0, DAY_LENGTH);
}

export function snapshotRow(
  userId: string,
  takenAt: string,
  positions: IndexPosition[],
): SnapshotRow {
  const total = positions.reduce((sum, p) => sum + p.valueUsd, 0);
  return {
    userId,
    takenAt,
    totalValueUsd: total.toFixed(2),
    byIndex: Object.fromEntries(
      positions.map((p) => [p.indexId, roundCents(p.valueUsd)]),
    ),
  };
}

function netDepositSteps(flows: DatedFlow[]): ValuePoint[] {
  let total = 0;
  return [...flows]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((flow) => {
      total += flow.direction === "in" ? flow.valueUsd : -flow.valueUsd;
      return { time: Date.parse(flow.at), valueUsd: total };
    });
}

export function historySeries(
  snapshots: StoredSnapshot[],
  flows: DatedFlow[],
  live: ValuePoint,
): ValuePoint[] {
  const today = snapshotDate(new Date(live.time));
  const past = snapshots
    .filter((s) => s.takenAt < today)
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt))
    .map((s) => ({ time: Date.parse(s.takenAt), valueUsd: s.totalValueUsd }));
  return [...(past.length > 0 ? past : netDepositSteps(flows)), live];
}
