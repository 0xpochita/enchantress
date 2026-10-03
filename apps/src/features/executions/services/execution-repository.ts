import "server-only";
import { and, asc, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  type ExecutionRow,
  type ExecutionStepRow,
  executionSteps,
  executions,
  ledger,
  positionLots,
} from "@/lib/db/schema";
import { ACTIVE_STATUSES, type ExecutionView } from "../types";
import type { PlannedStep } from "../utils/plan";

const LEASE_SECONDS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface LoadedExecution {
  execution: ExecutionRow;
  steps: ExecutionStepRow[];
}

export async function createExecution(input: {
  userId: string;
  indexId: string;
  depositAsset: string;
  depositAmountBase: bigint;
  valueUsd: number;
  steps: PlannedStep[];
}): Promise<ExecutionRow> {
  return db().transaction(async (tx) => {
    const [execution] = await tx
      .insert(executions)
      .values({
        userId: input.userId,
        indexId: input.indexId,
        kind: "deposit",
        status: "executing",
        depositAsset: input.depositAsset,
        depositAmountBase: input.depositAmountBase.toString(),
        valueUsd: input.valueUsd.toFixed(2),
      })
      .returning();
    await tx
      .insert(executionSteps)
      .values(
        input.steps.map((step) => ({ executionId: execution.id, ...step })),
      );
    return execution;
  });
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

export async function finishExecution(
  id: string,
  status: "succeeded" | "failed" | "refunded" | "cancelled",
  error?: { code: string; message: string },
): Promise<void> {
  await db()
    .update(executions)
    .set({
      status,
      errorCode: error?.code ?? null,
      errorMessage: error?.message ?? null,
      leaseUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(executions.id, id));
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

export async function spentTodayUsd(userId: string): Promise<number> {
  const since = new Date(Date.now() - DAY_MS);
  const [row] = await db()
    .select({ total: sql<string>`coalesce(sum(${executions.valueUsd}), 0)` })
    .from(executions)
    .where(
      and(
        eq(executions.userId, userId),
        inArray(executions.status, ["executing", "succeeded"]),
        gt(executions.createdAt, since),
      ),
    );
  return Number(row?.total ?? 0);
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

export async function createBridgingExecution(input: {
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
}): Promise<ExecutionRow> {
  const [execution] = await db()
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
    .returning();
  return execution;
}

export async function insertSteps(
  executionId: string,
  steps: PlannedStep[],
): Promise<void> {
  if (steps.length === 0) return;
  await db()
    .insert(executionSteps)
    .values(steps.map((step) => ({ executionId, ...step })));
}

export async function updateExecution(
  id: string,
  patch: Partial<ExecutionRow>,
): Promise<void> {
  await db()
    .update(executions)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(executions.id, id));
}
