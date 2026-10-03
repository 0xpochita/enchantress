import type { Hex } from "viem";
import type { ExecutionStepRow } from "@/lib/db/schema";
import {
  ExecutionStepError,
  failureOf,
  isTransient,
  retryNote,
} from "../utils/failures.ts";
import type { LoadedExecution } from "./execution-repository.ts";
import type { RunnerPorts, Wallet } from "./runner-ports.ts";
import { resolveAmount, type StepContext, stepEntry } from "./step-entries.ts";

const SETTLED_FAILURES = new Set([
  "execution_reverted",
  "failed",
  "replaced",
  "provider_error",
]);

async function unitsBefore(ctx: StepContext): Promise<bigint | null> {
  if (ctx.step.unitsBefore !== null) return BigInt(ctx.step.unitsBefore);
  const units = await stepEntry(ctx.step).unitsBefore(ctx);
  if (units !== null)
    await ctx.ports.store.updateStep(ctx.step.id, {
      unitsBefore: units.toString(),
    });
  return units;
}

async function sendStep(ctx: StepContext) {
  const { ports, loaded, step, wallet } = ctx;
  const amount = resolveAmount(step, loaded.steps);
  const transaction = await stepEntry(step).build(ctx, amount);
  const before = await unitsBefore(ctx);
  const attempts = step.attempts + 1;
  const sent = await ports.sender.send({
    walletId: wallet.id,
    ...transaction,
    idempotencyKey: `${loaded.execution.id}:${step.position}:${attempts}`,
  });
  await ports.store.updateStep(step.id, {
    status: "sent",
    attempts,
    unitsBefore: before?.toString() ?? null,
    privyTransactionId: sent.transactionId,
    txHash: sent.hash,
    lastError: null,
  });
}

async function confirmedHash(ctx: StepContext): Promise<Hex | null> {
  if (!ctx.step.privyTransactionId)
    throw new ExecutionStepError(
      "NO_TRANSACTION",
      "The transaction was never sent.",
    );
  const state = await ctx.ports.sender.state(ctx.step.privyTransactionId);
  if (SETTLED_FAILURES.has(state.status))
    throw new ExecutionStepError(
      "TRANSACTION_FAILED",
      `The transaction ${state.status.replace("_", " ")}.`,
    );
  if (state.status !== "confirmed" || !state.hash) return null;
  return state.hash as Hex;
}

function isLastStep(loaded: LoadedExecution, step: ExecutionStepRow) {
  return loaded.steps.every(
    (s) => s.position <= step.position || s.status === "confirmed",
  );
}

async function settleStep(ctx: StepContext) {
  const { ports, loaded, step } = ctx;
  const hash = await confirmedHash(ctx);
  if (!hash) return;
  const receipt = await ports.chain.receipt(hash);
  if (receipt.status !== "success")
    throw new ExecutionStepError(
      "REVERTED",
      "The transaction reverted on Monad.",
    );
  const amountOut = await stepEntry(step).settle(ctx, receipt);
  await ports.store.updateStep(step.id, {
    status: "confirmed",
    txHash: hash,
    amountOutBase: amountOut?.toString() ?? null,
  });
  if (isLastStep(loaded, step))
    await ports.store.finish(loaded.execution.id, "succeeded");
}

async function walletOf(ports: RunnerPorts, userId: string): Promise<Wallet> {
  const wallet = await ports.store.walletOf(userId);
  if (!wallet)
    throw new ExecutionStepError(
      "NO_WALLET",
      "This account has no embedded wallet.",
    );
  return wallet;
}

async function runStep(
  ports: RunnerPorts,
  loaded: LoadedExecution,
  step: ExecutionStepRow,
) {
  const wallet = await walletOf(ports, loaded.execution.userId);
  const ctx = { ports, loaded, step, wallet };
  if (step.status === "pending") await sendStep(ctx);
  else if (step.status === "sent") await settleStep(ctx);
}

async function recordFailure(
  ports: RunnerPorts,
  id: string,
  step: ExecutionStepRow | undefined,
  error: unknown,
) {
  if (isTransient(error)) {
    if (step)
      await ports.store.updateStep(step.id, { lastError: retryNote(error) });
    return;
  }
  const failure = failureOf(error);
  if (step)
    await ports.store.updateStep(step.id, {
      status: "failed",
      lastError: failure.message,
    });
  await ports.store.finish(id, "failed", failure);
}

async function advanceLoaded(ports: RunnerPorts, loaded: LoadedExecution) {
  const { execution, steps } = loaded;
  if (execution.status === "bridging") return ports.advanceBridging(loaded);
  if (execution.status !== "executing") return;
  const step = steps.find((s) => s.status !== "confirmed");
  if (!step) return ports.store.finish(execution.id, "succeeded");
  await runStep(ports, loaded, step);
}

export async function advanceWith(
  ports: RunnerPorts,
  id: string,
): Promise<void> {
  if (!(await ports.store.acquireLease(id))) return;
  let step: ExecutionStepRow | undefined;
  try {
    const loaded = await ports.store.load(id);
    if (!loaded) return;
    step = loaded.steps.find((s) => s.status !== "confirmed");
    await advanceLoaded(ports, loaded);
  } catch (error) {
    await recordFailure(ports, id, step, error);
  } finally {
    await ports.store.releaseLease(id);
  }
}
