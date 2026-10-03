import "server-only";
import { after } from "next/server";
import type { Address } from "viem";
import { MONAD_DIRECT_ASSETS } from "@/features/bridge/services/bridge-catalog";
import { notifyAuroraTransfer } from "@/features/bridge/services/bridge-lifecycle";
import { prepareBridgeDeposit } from "@/features/bridge/services/create-bridge-deposit";
import type {
  BridgeDepositResponse,
  CreateBridgeDepositBody,
} from "@/features/bridge/types";
import { monadClient } from "@/features/chain/services/public-client";
import type { UserRow } from "@/lib/db/schema";
import {
  ACTIVE_STATUSES,
  type CreateExecutionBody,
  type CreateWithdrawBody,
  ExecutionRequestError,
  type ExecutionView,
} from "../types";
import { prepareDeposit } from "./create-deposit";
import { prepareWithdraw } from "./create-withdraw";
import {
  activeExecutionId,
  BUSY_MESSAGE,
  cancelUnfundedBridging,
  cancelUnsentBridging,
  createBridgingExecution,
  createExecution,
  type LoadedExecution,
  loadExecution,
  type NewExecution,
  recordOriginTx,
  toExecutionView,
} from "./execution-repository";
import { isMonadSponsored } from "./privy-sender";
import { advanceExecution } from "./runner";

function requireDelegatedWallet(user: UserRow): Address {
  if (!user.walletId || !user.walletAddress)
    throw new ExecutionRequestError(
      409,
      "NO_WALLET",
      "Your wallet is still being created.",
    );
  if (!user.delegatedAt)
    throw new ExecutionRequestError(
      409,
      "NOT_DELEGATED",
      "Allow Enchantress to manage your vault deposits first.",
    );
  return user.walletAddress as Address;
}

async function assertNoActiveExecution(userId: string): Promise<void> {
  await cancelUnfundedBridging(userId);
  if (await activeExecutionId(userId))
    throw new ExecutionRequestError(409, "BUSY", BUSY_MESSAGE);
}

async function assertMonadGas(address: Address): Promise<void> {
  if (isMonadSponsored()) return;
  const balance = await monadClient().getBalance({ address });
  if (balance === 0n)
    throw new ExecutionRequestError(
      400,
      "NO_GAS",
      "Add a little MON to your wallet on Monad to pay for gas.",
    );
}

async function readyWallet(user: UserRow): Promise<Address> {
  const wallet = requireDelegatedWallet(user);
  await assertNoActiveExecution(user.id);
  await assertMonadGas(wallet);
  return wallet;
}

function wakeRunner(id: string): void {
  after(() => advanceExecution(id));
}

async function viewOf(id: string): Promise<ExecutionView> {
  const loaded = await loadExecution(id);
  if (!loaded)
    throw new ExecutionRequestError(
      500,
      "LOAD",
      "Could not load the execution.",
    );
  return toExecutionView(loaded);
}

async function ownedExecution(
  user: UserRow,
  id: string,
): Promise<LoadedExecution> {
  const loaded = await loadExecution(id);
  if (!loaded || loaded.execution.userId !== user.id)
    throw new ExecutionRequestError(404, "NOT_FOUND", "Not found.");
  return loaded;
}

async function ownedBridgingExecution(
  user: UserRow,
  id: string,
): Promise<LoadedExecution> {
  const loaded = await ownedExecution(user, id);
  if (loaded.execution.status !== "bridging")
    throw new ExecutionRequestError(
      409,
      "STATE",
      "This deposit is no longer waiting for a transfer.",
    );
  return loaded;
}

async function startExecution(input: NewExecution): Promise<ExecutionView> {
  const execution = await createExecution(input);
  wakeRunner(execution.id);
  return viewOf(execution.id);
}

export async function startDeposit(
  user: UserRow,
  body: CreateExecutionBody,
): Promise<ExecutionView> {
  const wallet = await readyWallet(user);
  return startExecution(await prepareDeposit(user.id, wallet, body));
}

export async function startWithdraw(
  user: UserRow,
  body: CreateWithdrawBody,
): Promise<ExecutionView> {
  const wallet = await readyWallet(user);
  return startExecution(await prepareWithdraw(user, wallet, body));
}

export async function startBridgeDeposit(
  user: UserRow,
  body: CreateBridgeDepositBody,
): Promise<BridgeDepositResponse> {
  const directAsset = MONAD_DIRECT_ASSETS[body.originTokenId];
  if (directAsset) {
    const { indexId, amount } = body;
    const execution = await startDeposit(user, {
      indexId,
      depositAsset: directAsset,
      amount,
    });
    return { execution, transfer: null };
  }
  const wallet = await readyWallet(user);
  const prepared = await prepareBridgeDeposit(user.id, wallet, body);
  const execution = await createBridgingExecution(prepared.execution);
  return { execution: await viewOf(execution.id), transfer: prepared.transfer };
}

export async function submitBridgeDeposit(
  user: UserRow,
  id: string,
  txHash: string,
): Promise<ExecutionView> {
  const { execution } = await ownedBridgingExecution(user, id);
  await recordOriginTx(id, txHash);
  await notifyAuroraTransfer(execution, txHash);
  wakeRunner(id);
  return viewOf(id);
}

export async function cancelExecution(
  user: UserRow,
  id: string,
): Promise<ExecutionView> {
  const { execution } = await ownedBridgingExecution(user, id);
  if (execution.originTxHash || !(await cancelUnsentBridging(id)))
    throw new ExecutionRequestError(
      409,
      "SENT",
      "The transfer was already sent and cannot be cancelled.",
    );
  return viewOf(id);
}

export async function getOwnedExecution(
  user: UserRow,
  id: string,
): Promise<ExecutionView> {
  const loaded = await ownedExecution(user, id);
  const isActive = (ACTIVE_STATUSES as readonly string[]).includes(
    loaded.execution.status,
  );
  if (isActive) wakeRunner(id);
  return toExecutionView(loaded);
}
