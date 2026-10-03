import "server-only";
import { asc } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db/client";
import {
  type IndexAllocationRow,
  type IndexRow,
  indexAllocations,
  indexes,
} from "@/lib/db/schema";
import type { Index } from "@/types/market";
import { getIndexTvls } from "./index-tvl";

const BPS = 10_000;
const INDEXES_REVALIDATE_SECONDS = 60;

function toIndex(
  row: IndexRow,
  allocations: IndexAllocationRow[],
  tvlUsd: number,
): Index {
  return {
    id: row.id,
    name: row.name,
    creator: row.creatorAddress,
    createdAt: row.createdAt.toISOString(),
    tvlUsd,
    positionUsd: 0,
    isCreatedByUser: false,
    allocations: allocations
      .filter((a) => a.indexId === row.id)
      .sort((a, b) => a.position - b.position)
      .map((a) => ({ assetSymbol: a.assetSymbol, weight: a.weightBps / BPS })),
    isFeatured: row.isFeatured,
  };
}

async function readIndexes(): Promise<Index[]> {
  const [rows, allocations, tvls] = await Promise.all([
    db().select().from(indexes).orderBy(asc(indexes.createdAt)),
    db().select().from(indexAllocations),
    getIndexTvls(),
  ]);
  return rows.map((row) => toIndex(row, allocations, tvls[row.id] ?? 0));
}

export const listIndexes = unstable_cache(readIndexes, ["indexes"], {
  revalidate: INDEXES_REVALIDATE_SECONDS,
  tags: ["indexes"],
});
