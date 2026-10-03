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

export function historySeries(
  snapshots: StoredSnapshot[],
  live: ValuePoint,
): ValuePoint[] {
  const today = snapshotDate(new Date(live.time));
  const past = snapshots
    .filter((s) => s.takenAt < today)
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt))
    .map((s) => ({ time: Date.parse(s.takenAt), valueUsd: s.totalValueUsd }));
  return [...past, live];
}
