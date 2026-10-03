"use client";

import { useSendTransaction } from "@privy-io/react-auth";
import { toHex } from "viem";
import { readClientEnv } from "@/config/env.client";
import {
  type ExecutionFlow,
  type ExecutionView,
  executionViewSchema,
  type FlowContext,
  useExecutionFlow,
} from "@/features/executions";
import { type Api, ApiError } from "@/lib/api-client";
import {
  bridgeDepositResponseSchema,
  type TransferInstruction,
} from "../types";
import { buildTransferRequest } from "../utils/transfer";

export type BridgeStage =
  | "permission"
  | "quote"
  | "sign"
  | "submit"
  | "bridging"
  | "executing";

export type BridgeStartStage = Exclude<BridgeStage, "bridging" | "executing">;

export interface BridgeDepositInput {
  indexId: string | undefined;
  originTokenId: string;
  amount: string;
}

function sponsoredChainIds(): number[] {
  const env = readClientEnv();
  return env.success ? env.data.NEXT_PUBLIC_SPONSORED_CHAIN_IDS : [];
}

function useSignTransfer() {
  const { sendTransaction } = useSendTransaction();
  return async (transfer: TransferInstruction): Promise<`0x${string}`> => {
    const request = buildTransferRequest(transfer);
    const { hash } = await sendTransaction(
      {
        to: request.to,
        data: request.data,
        value: request.value === undefined ? undefined : toHex(request.value),
        chainId: request.chainId,
      },
      { sponsor: sponsoredChainIds().includes(request.chainId) },
    );
    return hash;
  };
}

async function cancelAndThrow(
  api: Api,
  executionId: string,
  error: unknown,
): Promise<never> {
  await api
    .delete(`/api/executions/${executionId}`, executionViewSchema)
    .catch(() => undefined);
  throw error;
}

export function useStartBridgeDeposit() {
  const signTransfer = useSignTransfer();
  return async (
    { api, setStage, delegate }: FlowContext<BridgeStartStage>,
    input: BridgeDepositInput,
  ): Promise<ExecutionView> => {
    if (!input.indexId) throw new ApiError(400, "Pick an index first.");
    await delegate();
    setStage("quote");
    const { indexId, originTokenId, amount } = input;
    const result = await api.post(
      "/api/bridge/deposits",
      { indexId, originTokenId, amount },
      bridgeDepositResponseSchema,
    );
    const id = result.execution.id;
    if (!result.transfer) return result.execution;
    setStage("sign");
    const txHash = await signTransfer(result.transfer).catch((error) =>
      cancelAndThrow(api, id, error),
    );
    setStage("submit");
    return api.post(
      `/api/bridge/deposits/${id}/submit`,
      { txHash },
      executionViewSchema,
    );
  };
}

export function bridgeStage(
  flow: ExecutionFlow<BridgeStartStage>,
): BridgeStage {
  if (flow.phase !== "tracking") return flow.stage ?? "quote";
  return flow.execution?.status === "bridging" ? "bridging" : "executing";
}

export function useBridgeDeposit(input: BridgeDepositInput) {
  const start = useStartBridgeDeposit();
  const flow = useExecutionFlow<BridgeStartStage>((context) =>
    start(context, input),
  );
  return { ...flow, stage: bridgeStage(flow) };
}

export type BridgeDepositController = ReturnType<typeof useBridgeDeposit>;
