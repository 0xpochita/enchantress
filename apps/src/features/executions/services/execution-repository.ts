import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  type ExecutionRow,
  type ExecutionStepRow,
  executionSteps,
  executions,
  ledger,
  ONE_ACTIVE_EXECUTION_INDEX,
  positionLots,
  users,
} from "@/lib/db/schema";
import {
  ACTIVE_STATUSES,
  ExecutionRequestError,
  type ExecutionStatus,
  type ExecutionView,
} from "../types";
import type { PlannedStep } from "../utils/plan";
import { statusesLeadingTo } from "../utils/transitions";
import { reduceLots } from "../utils/withdraw";

const LEASE_SECONDS = 60;
const UNIQUE_VIOLATION = "23505";
const UNFUNDED_GRACE_SECONDS = 120;

type Executor = Pick<ReturnType<typeof db>, "insert" | "update">;

export interface LoadedExecution {
  execution: ExecutionRow;
  steps: ExecutionStepRow[];
}

export const BUSY_MESSAGE =
  "Another deposit or withdrawal is still running. Wait for it to finish.";

function isActiveExecutionConflict(error: unknown): boolean {
  const cause = error instanceof Error ? (error.cause ?? error) : error;
  if (typeof cause !== "object" || cause === null) return false;
  const pgError = cause as { code?: string; constraint_name?: string };
  return (
    pgError.code === UNIQUE_VIOLATION &&
    pgError.constraint_name === ONE_ACTIVE_EXECUTION_INDEX
  );
}

export async function cancelUnfundedBridging(userId: string): Promise<boolean> {
  const rows = await db()
    .update(executions)
    .set({ status: "cancelled", leaseUntil: null, updatedAt: new Date() })
    .where(
      and(
        eq(executions.userId, userId),
        eq(executions.status, "bridging"),
        isNull(executions.originTxHash),
        lt(
          executions.createdAt,
          sql`now() - make_interval(secs => ${UNFUNDED_GRACE_SECONDS})`,
        ),
      ),
    )
    .returning({ id: executions.id });
  return rows.length > 0;
}

async function insertActiveExecution<T>(
  userId: string,
  create: () => Promise<T>,
): Promise<T> {
  try {
    return await create();
  } catch (error) {
    if (!isActiveExecutionConflict(error)) throw error;
    if (await cancelUnfundedBridging(userId))
      return insertActiveExecution(userId, create);
    throw new ExecutionRequestError(409, "BUSY", BUSY_MESSAGE);
  }
}

async function insertPlannedSteps(
  executor: Executor,
  executionId: string,
  steps: PlannedStep[],
): Promise<void> {
  if (steps.length === 0) return;
  await executor
    .insert(executionSteps)
    .values(steps.map((step) => ({ executionId, ...step })));
}

export interface NewExecution {
  kind: "deposit" | "withdraw";
  userId: string;
  indexId: string;
  depositAsset: string;
  depositAmountBase: bigint;
  valueUsd: number;
  steps: PlannedStep[];
}

export function createExecution(input: NewExecution): Promise<ExecutionRow> {
  return insertActiveExecution(input.userId, () =>
    db().transaction(async (tx) => {
      const [execution] = await tx
        .insert(executions)
        .values({
          userId: input.userId,
          indexId: input.indexId,
          kind: input.kind,
          status: "executing",
          depositAsset: input.depositAsset,
          depositAmountBase: input.depositAmountBase.toString(),
          valueUsd: input.valueUsd.toFixed(2),
        })
        .returning();
      await insertPlannedSteps(tx, execution.id, input.steps);
      return execution;
    }),
  );
}

export async function loadExecution(
  id: string,
): Promise<LoadedExecution | undefined> {
  const [execution] = await db()
    .select()
    .from(executions)
    .where(eq(executions.id, id))
    .limit(1);
  if (!execution) return undefined;
  const steps = await db()
    .select()
    .from(executionSteps)
    .where(eq(executionSteps.executionId, id))
    .orderBy(asc(executionSteps.position));
  return { execution, steps };
}

export async function acquireLease(id: string): Promise<boolean> {
  const rows = await db()
    .update(executions)
    .set({
      leaseUntil: sql`now() + make_interval(secs => ${LEASE_SECONDS})`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(executions.id, id),
        inArray(executions.status, [...ACTIVE_STATUSES]),
        or(
          isNull(executions.leaseUntil),
          lt(executions.leaseUntil, sql`now()`),
        ),
      ),
    )
    .returning({ id: executions.id });
  return rows.length > 0;
}

export async function releaseLease(id: string): Promise<void> {
  await db()
    .update(executions)
    .set({ leaseUntil: null, updatedAt: new Date() })
    .where(eq(executions.id, id));
}

export async function updateStep(
  stepId: string,
  patch: Partial<ExecutionStepRow>,
): Promise<void> {
  await db()
    .update(executionSteps)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(executionSteps.id, stepId));
}

export async function transitionExecution(input: {
  id: string;
  to: ExecutionStatus;
  patch?: ExecutionPatch;
  condition?: SQL;
  executor?: Executor;
}): Promise<boolean> {
  const rows = await (input.executor ?? db())
    .update(executions)
    .set({ ...input.patch, status: input.to, updatedAt: new Date() })
    .where(
      and(
        eq(executions.id, input.id),
        inArray(executions.status, statusesLeadingTo(input.to)),
        input.condition,
      ),
    )
    .returning({ id: executions.id });
  return rows.length > 0;
}

export async function finishExecution(
  id: string,
  status: "succeeded" | "failed" | "refunded" | "cancelled",
  error?: { code: string; message: string },
): Promise<void> {
  await transitionExecution({
    id,
    to: status,
    patch: {
      errorCode: error?.code ?? null,
      errorMessage: error?.message ?? null,
      leaseUntil: null,
    },
  });
}

export function cancelUnsentBridging(id: string): Promise<boolean> {
  return transitionExecution({
    id,
    to: "cancelled",
    patch: { errorCode: null, errorMessage: null, leaseUntil: null },
    condition: isNull(executions.originTxHash),
  });
}

export async function recordOriginTx(
  id: string,
  txHash: string,
): Promise<void> {
  await db()
    .update(executions)
    .set({ originTxHash: txHash, updatedAt: new Date() })
    .where(
      and(
        eq(executions.id, id),
        eq(executions.status, "bridging"),
        isNull(executions.originTxHash),
      ),
    );
}

export function landBridgedExecution(input: {
  id: string;
  landedBase: bigint;
  steps: PlannedStep[];
}): Promise<boolean> {
  return db().transaction(async (tx) => {
    const landed = await transitionExecution({
      id: input.id,
      to: "executing",
      patch: {
        depositAmountBase: input.landedBase.toString(),
        auroraStatus: "SUCCESS",
      },
      executor: tx,
    });
    if (landed) await insertPlannedSteps(tx, input.id, input.steps);
    return landed;
  });
}

export async function recordDeposit(input: {
  execution: ExecutionRow;
  step: ExecutionStepRow;
  units: bigint;
  amountBase: bigint;
  valueUsd: number;
  txHash: string;
}): Promise<void> {
  const shared = {
    userId: input.execution.userId,
    indexId: input.execution.indexId,
    venueId: input.step.venueId,
    assetSymbol: input.step.assetSymbol,
    executionId: input.execution.id,
  };
  await db().transaction(async (tx) => {
    await tx
      .insert(positionLots)
      .values({ ...shared, units: input.units.toString() });
    await tx.insert(ledger).values({
      ...shared,
      direction: "in",
      amountBase: input.amountBase.toString(),
      valueUsd: input.valueUsd.toFixed(2),
      txHash: input.txHash,
    });
  });
}

export async function activeExecutionId(
  userId: string,
): Promise<string | null> {
  const [row] = await db()
    .select({ id: executions.id })
    .from(executions)
    .where(
      and(
        eq(executions.userId, userId),
        inArray(executions.status, [...ACTIVE_STATUSES]),
      ),
    )
    .limit(1);
  return row?.id ?? null;
}

export async function staleExecutionIds(): Promise<string[]> {
  const rows = await db()
    .select({ id: executions.id })
    .from(executions)
    .where(
      and(
        inArray(executions.status, [...ACTIVE_STATUSES]),
        or(
          isNull(executions.leaseUntil),
          lt(executions.leaseUntil, sql`now()`),
        ),
      ),
    );
  return rows.map((row) => row.id);
}

export function toExecutionView(loaded: LoadedExecution): ExecutionView {
  const { execution, steps } = loaded;
  return {
    id: execution.id,
    status: execution.status as ExecutionView["status"],
    indexId: execution.indexId,
    depositAsset: execution.depositAsset,
    depositAmountBase: execution.depositAmountBase,
    valueUsd: Number(execution.valueUsd),
    originChain: execution.originChain,
    originTxHash: execution.originTxHash,
    auroraStatus: execution.auroraStatus,
    errorMessage: execution.errorMessage,
    createdAt: execution.createdAt.toISOString(),
    steps: steps.map((step) => ({
      position: step.position,
      kind: step.kind as ExecutionView["steps"][number]["kind"],
      assetSymbol: step.assetSymbol,
      venueId: step.venueId,
      status: step.status as ExecutionView["steps"][number]["status"],
      txHash: step.txHash,
    })),
  };
}

export interface NewBridgingExecution {
  userId: string;
  indexId: string;
  valueUsd: number;
  estimatedLandedBase: bigint;
  originChain: string;
  originAssetId: string;
  originAmountBase: bigint;
  depositAddress: string;
  depositMemo: string | null;
  deadline: Date;
}

export async function createBridgingExecution(
  input: NewBridgingExecution,
): Promise<ExecutionRow> {
  const [execution] = await insertActiveExecution(input.userId, () =>
    db()
      .insert(executions)
      .values({
        userId: input.userId,
        indexId: input.indexId,
        kind: "deposit",
        status: "bridging",
        depositAsset: "USDC",
        depositAmountBase: input.estimatedLandedBase.toString(),
        valueUsd: input.valueUsd.toFixed(2),
        originChain: input.originChain,
        originAssetId: input.originAssetId,
        originAmountBase: input.originAmountBase.toString(),
        auroraDepositAddress: input.depositAddress,
        auroraDepositMemo: input.depositMemo,
        auroraDeadline: input.deadline,
        auroraStatus: "PENDING_DEPOSIT",
      })
      .returning(),
  );
  return execution;
}

export type ExecutionPatch = Omit<Partial<ExecutionRow>, "status">;

export async function updateExecution(
  id: string,
  patch: ExecutionPatch,
): Promise<void> {
  await db()
    .update(executions)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(executions.id, id));
}

export interface LotTotal {
  indexId: string;
  venueId: string;
  assetSymbol: string;
  units: bigint;
}

export async function userLotTotals(userId: string): Promise<LotTotal[]> {
  const rows = await db()
    .select({
      indexId: positionLots.indexId,
      venueId: positionLots.venueId,
      assetSymbol: positionLots.assetSymbol,
      units: sql<string>`sum(${positionLots.units}::numeric)::text`,
    })
    .from(positionLots)
    .where(eq(positionLots.userId, userId))
    .groupBy(
      positionLots.indexId,
      positionLots.venueId,
      positionLots.assetSymbol,
    );
  return rows.map((row) => ({ ...row, units: BigInt(row.units) }));
}

export async function recordWithdraw(input: {
  execution: ExecutionRow;
  step: ExecutionStepRow;
  burnedUnits: bigint;
  amountBase: bigint;
  valueUsd: number;
  txHash: string;
}): Promise<void> {
  const shared = {
    userId: input.execution.userId,
    indexId: input.execution.indexId,
    venueId: input.step.venueId,
    assetSymbol: input.step.assetSymbol,
  };
  await db().transaction(async (tx) => {
    const lots = await tx
      .select({ id: positionLots.id, units: positionLots.units })
      .from(positionLots)
      .where(
        and(
          eq(positionLots.userId, shared.userId),
          eq(positionLots.indexId, shared.indexId),
          eq(positionLots.venueId, shared.venueId),
          eq(positionLots.assetSymbol, shared.assetSymbol),
        ),
      )
      .orderBy(asc(positionLots.createdAt))
      .for("update");
    const updates = reduceLots(
      lots.map((lot) => ({ id: lot.id, units: BigInt(lot.units) })),
      input.burnedUnits,
    );
    for (const lot of updates)
      await tx
        .update(positionLots)
        .set({ units: lot.units.toString() })
        .where(eq(positionLots.id, lot.id));
    await tx.insert(ledger).values({
      ...shared,
      executionId: input.execution.id,
      direction: "out",
      amountBase: input.amountBase.toString(),
      valueUsd: input.valueUsd.toFixed(2),
      txHash: input.txHash,
    });
  });
}

export type ActivityLedgerRow = typeof ledger.$inferSelect & {
  account: string | null;
  originChain: string | null;
};

export async function indexLedger(
  indexId: string,
  limit: number,
): Promise<ActivityLedgerRow[]> {
  const rows = await db()
    .select({
      entry: ledger,
      account: users.walletAddress,
      originChain: executions.originChain,
    })
    .from(ledger)
    .leftJoin(users, eq(users.id, ledger.userId))
    .leftJoin(executions, eq(executions.id, ledger.executionId))
    .where(eq(ledger.indexId, indexId))
    .orderBy(desc(ledger.at), desc(ledger.id))
    .limit(limit);
  return rows.map((row) => ({
    ...row.entry,
    account: row.account,
    originChain: row.originChain,
  }));
}
