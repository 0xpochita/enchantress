import { existsSync } from "node:fs";
import { and, eq, notInArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { indexAllocations, indexes } from "../src/lib/db/schema.ts";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const SEEDS = [
  {
    id: "monad-stable",
    name: "Monad Stable",
    creatorAddress: "0x0E5cC5a1b9d27F4c3E8A61dB04f2C08f",
    allocations: [
      ["USDC", 5000],
      ["USDT0", 5000],
    ],
  },
  {
    id: "mon-maxi",
    name: "MON Maxi",
    creatorAddress: "0x8a3F1c90bB24e6D7A5f01C3e9D42b7aE11f09C2d",
    allocations: [
      ["WMON", 6000],
      ["USDC", 4000],
    ],
  },
  {
    id: "eth-yield",
    name: "ETH Yield",
    creatorAddress: "0x4B2d7E91c05aF3b8D6e1C27f9A04d5bE83c1F6a0",
    allocations: [
      ["WETH", 7000],
      ["USDC", 3000],
    ],
  },
  {
    id: "blue-chip",
    name: "Blue Chip",
    creatorAddress: "0xC71e0A5b3D8f24E96a1B7c0d5F3e82A9b4D61E07",
    allocations: [
      ["WETH", 5000],
      ["WMON", 2500],
      ["USDC", 2500],
    ],
  },
  {
    id: "dollar-mix",
    name: "Dollar Mix",
    creatorAddress: "0x2F9b6C1e4A07d3B85E2c9A1f6D0b4E7C3a5F8d12",
    allocations: [
      ["USDT0", 6000],
      ["USDC", 4000],
    ],
  },
] as const;

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = postgres(url, { max: 1 });
const db = drizzle(sql);

const seedIds = SEEDS.map((seed) => seed.id);
await db
  .delete(indexes)
  .where(and(eq(indexes.isFeatured, true), notInArray(indexes.id, seedIds)));

for (const seed of SEEDS) {
  await db
    .insert(indexes)
    .values({
      id: seed.id,
      name: seed.name,
      creatorAddress: seed.creatorAddress.toLowerCase(),
      isFeatured: true,
    })
    .onConflictDoUpdate({
      target: indexes.id,
      set: { name: seed.name, isFeatured: true },
    });
  await db
    .delete(indexAllocations)
    .where(eq(indexAllocations.indexId, seed.id));
  await db.insert(indexAllocations).values(
    seed.allocations.map(([assetSymbol, weightBps], position) => ({
      indexId: seed.id,
      assetSymbol,
      weightBps,
      position,
    })),
  );
  process.stdout.write(`seeded ${seed.id}\n`);
}

await sql.end();
