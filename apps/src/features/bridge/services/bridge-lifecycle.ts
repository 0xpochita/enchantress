import "server-only";
import {
  finishExecution,
  type LoadedExecution,
  landBridgedExecution,
  updateExecution,
} from "@/features/executions/services/execution-repository";
import { buildDepositPlan } from "@/features/executions/services/plan-deposit";
import type { ExecutionRow } from "@/lib/db/schema";
import { bridgeTransition } from "../utils/bridge-transition";
import {
  AuroraError,
  fetchAuroraStatus,
  submitAuroraDeposit,
} from "./aurora-client";

const LANDED_ASSET = "USDC";

export async function notifyAuroraTransfer(
  execution: ExecutionRow,
  txHash: string,
): Promise<void> {
  if (!execution.auroraDepositAddress) return;
  try {
    await submitAuroraDeposit(
      txHash,
      execution.auroraDepositAddress,
      execution.auroraDepositMemo ?? undefined,
    );
  } catch (error) {
    if (!(error instanceof AuroraError)) throw error;
    await updateExecution(execution.id, {
      auroraStatus: `SUBMIT_RETRY:${error.status}`,
    });
  }
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
  await landBridgedExecution({
    id: execution.id,
    landedBase,
    steps: plan.steps,
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
