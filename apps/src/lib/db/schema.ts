import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  privyDid: text("privy_did").notNull().unique(),
  email: text("email"),
  walletId: text("wallet_id"),
  walletAddress: text("wallet_address"),
  delegatedAt: timestamp("delegated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type UserRow = typeof users.$inferSelect;

export const indexes = pgTable("indexes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  creatorUserId: uuid("creator_user_id").references(() => users.id),
  creatorAddress: text("creator_address").notNull(),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const indexAllocations = pgTable(
  "index_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    indexId: text("index_id")
      .notNull()
      .references(() => indexes.id, { onDelete: "cascade" }),
    assetSymbol: text("asset_symbol").notNull(),
    weightBps: integer("weight_bps").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [unique().on(table.indexId, table.assetSymbol)],
);

export type IndexRow = typeof indexes.$inferSelect;
export type IndexAllocationRow = typeof indexAllocations.$inferSelect;
