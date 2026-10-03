import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
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

export const executions = pgTable("executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  indexId: text("index_id")
    .notNull()
    .references(() => indexes.id),
  kind: text("kind").notNull(),
  status: text("status").notNull(),
  depositAsset: text("deposit_asset").notNull(),
  depositAmountBase: text("deposit_amount_base").notNull(),
  valueUsd: numeric("value_usd", { precision: 18, scale: 2 }).notNull(),
  originChain: text("origin_chain"),
  originAssetId: text("origin_asset_id"),
  originAmountBase: text("origin_amount_base"),
  originTxHash: text("origin_tx_hash"),
  auroraDepositAddress: text("aurora_deposit_address"),
  auroraDepositMemo: text("aurora_deposit_memo"),
  auroraDeadline: timestamp("aurora_deadline", { withTimezone: true }),
  auroraStatus: text("aurora_status"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  leaseUntil: timestamp("lease_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const executionSteps = pgTable(
  "execution_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    executionId: uuid("execution_id")
      .notNull()
      .references(() => executions.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    kind: text("kind").notNull(),
    assetSymbol: text("asset_symbol").notNull(),
    venueId: text("venue_id").notNull(),
    spender: text("spender"),
    amountBase: text("amount_base"),
    amountFromPosition: integer("amount_from_position"),
    amountOutBase: text("amount_out_base"),
    unitsBefore: text("units_before"),
    status: text("status").notNull().default("pending"),
    privyTransactionId: text("privy_transaction_id"),
    txHash: text("tx_hash"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.executionId, table.position)],
);

export const positionLots = pgTable("position_lots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  indexId: text("index_id")
    .notNull()
    .references(() => indexes.id),
  venueId: text("venue_id").notNull(),
  assetSymbol: text("asset_symbol").notNull(),
  units: text("units").notNull(),
  executionId: uuid("execution_id").references(() => executions.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ledger = pgTable("ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  indexId: text("index_id")
    .notNull()
    .references(() => indexes.id),
  venueId: text("venue_id").notNull(),
  assetSymbol: text("asset_symbol").notNull(),
  direction: text("direction").notNull(),
  amountBase: text("amount_base").notNull(),
  valueUsd: numeric("value_usd", { precision: 18, scale: 2 }).notNull(),
  txHash: text("tx_hash").notNull(),
  executionId: uuid("execution_id").references(() => executions.id),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

export type ExecutionRow = typeof executions.$inferSelect;
export type ExecutionStepRow = typeof executionSteps.$inferSelect;

export const positionSnapshots = pgTable(
  "position_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    takenAt: date("taken_at").notNull(),
    totalValueUsd: numeric("total_value_usd", {
      precision: 18,
      scale: 2,
    }).notNull(),
    byIndex: jsonb("by_index").$type<Record<string, number>>().notNull(),
  },
  (table) => [unique().on(table.userId, table.takenAt)],
);
