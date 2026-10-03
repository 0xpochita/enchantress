import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { ledger, positionLots, positionSnapshots } from "@/lib/db/schema";
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
    .select()
    .from(ledger)
    .where(eq(ledger.userId, userId))
    .orderBy(desc(ledger.at));
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
