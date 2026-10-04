import "server-only";
import { eq, like, or } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { MONAD_TOKENS } from "@/features/chain/config/tokens";
import { routeSwaps } from "@/features/executions/services/plan-deposit";
import { db } from "@/lib/db/client";
import { indexAllocations, indexes, type UserRow } from "@/lib/db/schema";
import type { CreateIndexBody } from "../types";
import { routeSlices } from "../utils/route-index";
import { slugify, uniqueSlug } from "../utils/slug";
import { getMarketCatalog } from "./index-catalog";

const LIQUIDITY_PROBE_USDC = 100n * 10n ** BigInt(MONAD_TOKENS.USDC.decimals);

export class IndexRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "IndexRequestError";
  }
}

async function assertRoutable(body: CreateIndexBody): Promise<void> {
  const routing = routeSlices(body.allocations, await getMarketCatalog());
  if (!routing.ok)
    throw new IndexRequestError(
      422,
      "NO_VENUE",
      `No protocol on Monad takes ${routing.unroutableAsset} right now.`,
    );
  await routeSwaps(
    MONAD_TOKENS.USDC.symbol,
    routing.slices,
    LIQUIDITY_PROBE_USDC,
  );
}

async function freeSlug(name: string): Promise<string> {
  const base = slugify(name);
  const taken = await db()
    .select({ id: indexes.id })
    .from(indexes)
    .where(or(eq(indexes.id, base), like(indexes.id, `${base}-%`)));
  return uniqueSlug(
    base,
    taken.map((row) => row.id),
  );
}

interface NewIndex {
  id: string;
  creatorUserId: string;
  creatorAddress: string;
  body: CreateIndexBody;
}

async function insertIndex({ id, body, ...creator }: NewIndex) {
  return db().transaction(async (tx) => {
    const [row] = await tx
      .insert(indexes)
      .values({
        id,
        name: body.name,
        ...creator,
        isFeatured: false,
      })
      .onConflictDoNothing()
      .returning({ id: indexes.id });
    if (!row) return null;
    await tx.insert(indexAllocations).values(
      body.allocations.map((allocation, position) => ({
        indexId: id,
        assetSymbol: allocation.assetSymbol,
        weightBps: allocation.weightBps,
        position,
      })),
    );
    return row.id;
  });
}

export async function createIndex(
  user: UserRow,
  body: CreateIndexBody,
): Promise<{ id: string }> {
  if (!user.walletAddress)
    throw new IndexRequestError(
      409,
      "NO_WALLET",
      "Your wallet is still being created.",
    );
  await assertRoutable(body);
  const id = await insertIndex({
    id: await freeSlug(body.name),
    creatorUserId: user.id,
    creatorAddress: user.walletAddress,
    body,
  });
  if (!id)
    throw new IndexRequestError(
      409,
      "SLUG_TAKEN",
      "That name was just taken. Try again.",
    );
  revalidateTag("indexes", { expire: 0 });
  return { id };
}
