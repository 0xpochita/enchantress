import "server-only";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { findUserById } from "@/features/wallet/server";
import { db } from "@/lib/db/client";
import { ledger } from "@/lib/db/schema";
import {
  acquireLease,
  finishExecution,
  loadExecution,
  recordDeposit,
  recordWithdraw,
  releaseLease,
  updateStep,
} from "./execution-repository";
import type { ExecutionStore, Wallet } from "./runner-ports";

async function hasLedgerEntry(
  executionId: string,
  txHash: string,
): Promise<boolean> {
  const rows = await db()
    .select({ id: ledger.id })
    .from(ledger)
    .where(and(eq(ledger.executionId, executionId), eq(ledger.txHash, txHash)))
    .limit(1);
  return rows.length > 0;
}

async function walletOf(userId: string): Promise<Wallet | undefined> {
  const user = await findUserById(userId);
  if (!user?.walletId || !user.walletAddress) return undefined;
  return { id: user.walletId, address: user.walletAddress as Address };
}

export const executionStore: ExecutionStore = {
  acquireLease,
  releaseLease,
  load: loadExecution,
  updateStep,
  finish: finishExecution,
  recordDeposit,
  recordWithdraw,
  hasLedgerEntry,
  walletOf,
};
