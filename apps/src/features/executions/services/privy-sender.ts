import "server-only";
import type { Address, Hex } from "viem";
import { MONAD_CAIP2, MONAD_CHAIN } from "@/config/chains";
import { serverEnv } from "@/config/env.server";
import { privyServer } from "@/features/wallet/server";

export interface SendResult {
  transactionId: string | null;
  hash: string | null;
}

export type PrivyTransactionStatus =
  | "broadcasted"
  | "confirmed"
  | "execution_reverted"
  | "failed"
  | "replaced"
  | "pending"
  | "provider_error";

export interface TransactionState {
  status: PrivyTransactionStatus;
  hash: string | null;
}

function signerKey(): string {
  const key = serverEnv().PRIVY_AUTHORIZATION_PRIVATE_KEY;
  if (!key) throw new Error("PRIVY_AUTHORIZATION_PRIVATE_KEY is not set");
  return key;
}

export async function sendMonadTransaction(input: {
  walletId: string;
  to: Address;
  data: Hex;
  idempotencyKey: string;
}): Promise<SendResult> {
  const response = await privyServer()
    .wallets()
    .ethereum()
    .sendTransaction(input.walletId, {
      caip2: MONAD_CAIP2,
      sponsor: true,
      idempotency_key: input.idempotencyKey,
      authorization_context: { authorization_private_keys: [signerKey()] },
      params: {
        transaction: {
          to: input.to,
          data: input.data,
          value: "0x0",
          chain_id: MONAD_CHAIN.id,
        },
      },
    });
  return {
    transactionId: response.transaction_id ?? null,
    hash: response.hash || null,
  };
}

export async function readTransactionState(
  transactionId: string,
): Promise<TransactionState> {
  const transaction = await privyServer().transactions().get(transactionId);
  return {
    status: transaction.status as PrivyTransactionStatus,
    hash: transaction.transaction_hash,
  };
}
