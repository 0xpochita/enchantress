import "server-only";
import { and, desc, eq, getTableColumns, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  executions,
  ledger,
  positionLots,
  positionSnapshots,
} from "@/lib/db/schema";
import type { SnapshotRow, StoredSnapshot } from "../utils/snapshots";

const HISTORY_DAYS = 365;

const lotColumns = {
  userId: positionLots.userId,
  indexId: positionLots.indexId,
  venueId: positionLots.venueId,
  assetSymbol: positionLots.assetSymbol,
  units: positionLots.units,
};

export async function allLots() {
  return db().select(lotColumns).from(positionLots);
}

export async function userLots(userId: string) {
  return db()
    .select(lotColumns)
    .from(positionLots)
    .where(eq(positionLots.userId, userId));
}

export async function userLedger(userId: string) {
  return db()
    .select({ ...getTableColumns(ledger), originChain: executions.originChain })
    .from(ledger)
    .leftJoin(executions, eq(ledger.executionId, executions.id))
    .where(eq(ledger.userId, userId))
    .orderBy(desc(ledger.at));
}

const PURCHASE_LIMIT = 50;

const firstTxHash = sql<string | null>`(
  select s.tx_hash from execution_steps s
  where s.execution_id = "executions"."id" and s.tx_hash is not null
  order by s.position
  limit 1
)`;

export async function userExecutions(userId: string) {
  return db()
    .select({
      id: executions.id,
      indexId: executions.indexId,
      kind: executions.kind,
      status: executions.status,
      depositAsset: executions.depositAsset,
      depositAmountBase: executions.depositAmountBase,
      valueUsd: executions.valueUsd,
      originChain: executions.originChain,
      originAssetId: executions.originAssetId,
      originAmountBase: executions.originAmountBase,
      originTxHash: executions.originTxHash,
      firstTxHash,
      createdAt: executions.createdAt,
    })
    .from(executions)
    .where(
      and(eq(executions.userId, userId), ne(executions.status, "cancelled")),
    )
    .orderBy(desc(executions.createdAt))
    .limit(PURCHASE_LIMIT);
}

export async function userSnapshots(userId: string): Promise<StoredSnapshot[]> {
  const rows = await db()
    .select({
      takenAt: positionSnapshots.takenAt,
      totalValueUsd: positionSnapshots.totalValueUsd,
    })
    .from(positionSnapshots)
    .where(eq(positionSnapshots.userId, userId))
    .orderBy(desc(positionSnapshots.takenAt))
    .limit(HISTORY_DAYS);
  return rows.map((row) => ({
    ...row,
    totalValueUsd: Number(row.totalValueUsd),
  }));
}

export async function upsertSnapshots(rows: SnapshotRow[]): Promise<void> {
  if (rows.length === 0) return;
  await db()
    .insert(positionSnapshots)
    .values(rows)
    .onConflictDoUpdate({
      target: [positionSnapshots.userId, positionSnapshots.takenAt],
      set: {
        totalValueUsd: sql`excluded.total_value_usd`,
        byIndex: sql`excluded.by_index`,
      },
    });
}
