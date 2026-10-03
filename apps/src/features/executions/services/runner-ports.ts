import type { Address, Hex, TransactionReceipt } from "viem";
import type { ExecutionRow, ExecutionStepRow } from "@/lib/db/schema";
import type { AssetValue } from "../../portfolio/services/valuation.ts";
import type { VaultAdapter } from "../../vaults/types.ts";
import type { LoadedExecution } from "./execution-repository.ts";

export interface Wallet {
  id: string;
  address: Address;
}

export interface Transaction {
  to: Address;
  data: Hex;
}

export interface SendResult {
  transactionId: string | null;
  hash: string | null;
}

export interface TransactionState {
  status: string;
  hash: string | null;
}

export interface TransactionSender {
  send(
    input: Transaction & { walletId: string; idempotencyKey: string },
  ): Promise<SendResult>;
  state(transactionId: string): Promise<TransactionState>;
}

export interface ChainReader {
  receipt(hash: Hex): Promise<TransactionReceipt>;
  adapter(venueId: string): VaultAdapter | undefined;
}

export interface LedgerWrite {
  execution: ExecutionRow;
  step: ExecutionStepRow;
  amountBase: bigint;
  valueUsd: number;
  txHash: string;
}

export type FinalStatus = "succeeded" | "failed" | "refunded" | "cancelled";

export interface ExecutionStore {
  acquireLease(id: string): Promise<boolean>;
  releaseLease(id: string): Promise<void>;
  load(id: string): Promise<LoadedExecution | undefined>;
  updateStep(stepId: string, patch: Partial<ExecutionStepRow>): Promise<void>;
  finish(
    id: string,
    status: FinalStatus,
    error?: { code: string; message: string },
  ): Promise<void>;
  recordDeposit(input: LedgerWrite & { units: bigint }): Promise<void>;
  recordWithdraw(input: LedgerWrite & { burnedUnits: bigint }): Promise<void>;
  hasLedgerEntry(executionId: string, txHash: string): Promise<boolean>;
  walletOf(userId: string): Promise<Wallet | undefined>;
}

export interface PriceSource {
  priceUsd(symbol: string): Promise<number | undefined>;
  valueUsd(symbol: string, amountBase: bigint): Promise<AssetValue>;
}

export interface SwapQuoteRequest {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  expectedOut: bigint;
  pairLabel: string;
}

export interface SwapRouter {
  quote(request: SwapQuoteRequest): Promise<{ fee: number; amountOut: bigint }>;
  slippageBps(): number;
}

export interface RunnerPorts {
  store: ExecutionStore;
  sender: TransactionSender;
  chain: ChainReader;
  prices: PriceSource;
  swaps: SwapRouter;
  advanceBridging(loaded: LoadedExecution): Promise<void>;
}
