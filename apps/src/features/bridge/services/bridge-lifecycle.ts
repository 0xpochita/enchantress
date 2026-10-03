import "server-only";
import { DepositRequestError } from "@/features/executions/services/create-deposit";
import {
  finishExecution,
  insertSteps,
  type LoadedExecution,
  loadExecution,
  toExecutionView,
  updateExecution,
} from "@/features/executions/services/execution-repository";
import { buildDepositPlan } from "@/features/executions/services/plan-deposit";
import type { ExecutionView } from "@/features/executions/types";
import type { UserRow } from "@/lib/db/schema";
import { bridgeTransition } from "../utils/bridge-transition";
import {
  AuroraError,
  fetchAuroraStatus,
  submitAuroraDeposit,
} from "./aurora-client";

const LANDED_ASSET = "USDC";

async function ownedBridgingExecution(
  user: UserRow,
  id: string,
): Promise<LoadedExecution> {
  const loaded = await loadExecution(id);
  if (!loaded || loaded.execution.userId !== user.id)
    throw new DepositRequestError(404, "NOT_FOUND", "Deposit not found.");
  if (loaded.execution.status !== "bridging")
    throw new DepositRequestError(
      409,
      "STATE",
      "This deposit is no longer waiting for a transfer.",
    );
  return loaded;
}

export async function submitBridgeTransfer(
  user: UserRow,
  id: string,
  txHash: string,
): Promise<ExecutionView> {
  const loaded = await ownedBridgingExecution(user, id);
  const { execution } = loaded;
  if (!execution.originTxHash)
    await updateExecution(id, { originTxHash: txHash });
  if (execution.auroraDepositAddress) {
    try {
      await submitAuroraDeposit(
        txHash,
        execution.auroraDepositAddress,
        execution.auroraDepositMemo ?? undefined,
      );
    } catch (error) {
      if (!(error instanceof AuroraError)) throw error;
      await updateExecution(id, {
        auroraStatus: `SUBMIT_RETRY:${error.status}`,
      });
    }
  }
  const fresh = await loadExecution(id);
  if (!fresh)
    throw new DepositRequestError(500, "LOAD", "Could not load the deposit.");
  return toExecutionView(fresh);
}

export async function cancelBridgeDeposit(
  user: UserRow,
  id: string,
): Promise<ExecutionView> {
  const loaded = await ownedBridgingExecution(user, id);
  if (loaded.execution.originTxHash)
    throw new DepositRequestError(
      409,
      "SENT",
      "The transfer was already sent and cannot be cancelled.",
    );
  await finishExecution(id, "cancelled");
  const fresh = await loadExecution(id);
  if (!fresh)
    throw new DepositRequestError(500, "LOAD", "Could not load the deposit.");
  return toExecutionView(fresh);
}

async function landDeposit(
  loaded: LoadedExecution,
  landedBase: bigint,
): Promise<void> {
  const { execution } = loaded;
  const plan = await buildDepositPlan(
    execution.indexId,
    LANDED_ASSET,
    landedBase,
  );
  await insertSteps(execution.id, plan.steps);
  await updateExecution(execution.id, {
    depositAmountBase: landedBase.toString(),
    auroraStatus: "SUCCESS",
    status: "executing",
  });
}

export async function advanceBridging(loaded: LoadedExecution): Promise<void> {
  const { execution } = loaded;
  if (!execution.auroraDepositAddress)
    return finishExecution(execution.id, "failed", {
      code: "NO_DEPOSIT_ADDRESS",
      message: "The deposit address is missing.",
    });
  const status = await fetchAuroraStatus(
    execution.auroraDepositAddress,
    execution.auroraDepositMemo,
  );
  await updateExecution(execution.id, { auroraStatus: status.status });
  const transition = bridgeTransition({
    status: status.status,
    hasOriginTx: execution.originTxHash !== null,
    deadline: execution.auroraDeadline,
    now: new Date(),
    refundReason: status.swapDetails?.refundReason,
  });
  if (transition.kind === "wait") return;
  if (transition.kind === "refunded")
    return finishExecution(execution.id, "refunded", {
      code: "REFUNDED",
      message: transition.message,
    });
  if (transition.kind === "failed")
    return finishExecution(execution.id, "failed", {
      code: "BRIDGE_FAILED",
      message: transition.message,
    });
  const landed = status.swapDetails?.amountOut;
  if (!landed)
    return finishExecution(execution.id, "failed", {
      code: "NO_AMOUNT",
      message: "Aurora reported success without an amount.",
    });
  await landDeposit(loaded, BigInt(landed));
}
