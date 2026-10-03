"use client";

import { usePrivy, useSendTransaction } from "@privy-io/react-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toHex } from "viem";
import { readClientEnv } from "@/config/env.client";
import { type ExecutionView, executionViewSchema } from "@/features/executions";
import { useDelegation, useSession } from "@/features/wallet";
import { ApiError, apiDelete, apiGet, apiPost } from "@/lib/api-client";
import type { FlowStatus } from "@/types/flow";
import {
  bridgeDepositResponseSchema,
  type TransferInstruction,
} from "../types";
import { buildTransferRequest } from "../utils/transfer";

const POLL_MS = 4000;
const TERMINAL = new Set(["succeeded", "failed", "refunded", "cancelled"]);

export type BridgeStage =
  | "permission"
  | "quote"
  | "sign"
  | "submit"
  | "bridging"
  | "executing";

type Phase = "idle" | "confirming" | "submitting" | "tracking";

interface BridgeDepositInput {
  indexId: string | undefined;
  originTokenId: string;
  amount: string;
}

function sponsoredChainIds(): number[] {
  const env = readClientEnv();
  return env.success ? env.data.NEXT_PUBLIC_SPONSORED_CHAIN_IDS : [];
}

function errorText(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Something went wrong.";
}

function flowStatus(
  phase: Phase,
  execution: ExecutionView | undefined,
  hasError: boolean,
): FlowStatus {
  if (phase === "idle") return "idle";
  if (phase === "confirming") return "confirming";
  if (hasError) return "failed";
  if (execution?.status === "succeeded") return "success";
  if (execution && TERMINAL.has(execution.status)) return "failed";
  return "pending";
}

function trackingStage(execution: ExecutionView | undefined): BridgeStage {
  return execution?.status === "bridging" ? "bridging" : "executing";
}

export function useBridgeDeposit(input: BridgeDepositInput) {
  const session = useSession();
  const delegation = useDelegation();
  const { getAccessToken } = usePrivy();
  const { sendTransaction } = useSendTransaction();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState<BridgeStage>("quote");
  const [executionId, setExecutionId] = useState<string | null>(null);
  const withToken = async <T>(call: (token: string) => Promise<T>) => {
    const token = await getAccessToken();
    if (!token) throw new ApiError(401, "Please log in again.");
    return call(token);
  };
  const execution = useQuery({
    queryKey: ["execution", executionId],
    queryFn: () =>
      withToken((token) =>
        apiGet(`/api/executions/${executionId}`, executionViewSchema, token),
      ),
    enabled: executionId !== null && phase === "tracking",
    refetchInterval: (query) =>
      query.state.data && TERMINAL.has(query.state.data.status)
        ? false
        : POLL_MS,
  });
  const signTransfer = async (
    transfer: TransferInstruction,
  ): Promise<`0x${string}`> => {
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
  const cancel = async (id: string) => {
    await withToken((token) =>
      apiDelete(`/api/executions/${id}`, executionViewSchema, token),
    ).catch(() => undefined);
  };
  const create = useMutation({
    mutationFn: async () => {
      if (!input.indexId) throw new ApiError(400, "Pick an index first.");
      if (!delegation.isDelegated) {
        setStage("permission");
        await delegation.enable();
      }
      setStage("quote");
      const body = {
        indexId: input.indexId,
        originTokenId: input.originTokenId,
        amount: input.amount,
      };
      const result = await withToken((token) =>
        apiPost(
          "/api/bridge/deposits",
          body,
          bridgeDepositResponseSchema,
          token,
        ),
      );
      setExecutionId(result.execution.id);
      if (!result.transfer) return result.execution;
      setStage("sign");
      const hash = await signTransfer(result.transfer).catch(
        async (error: unknown) => {
          await cancel(result.execution.id);
          throw error;
        },
      );
      setStage("submit");
      return withToken((token) =>
        apiPost(
          `/api/bridge/deposits/${result.execution.id}/submit`,
          { txHash: hash },
          executionViewSchema,
          token,
        ),
      );
    },
    onSuccess: () => setPhase("tracking"),
  });
  const reset = () => {
    setPhase("idle");
    setStage("quote");
    setExecutionId(null);
    create.reset();
  };
  const hasError = create.isError;
  const currentStage: BridgeStage =
    phase === "tracking" ? trackingStage(execution.data) : stage;
  return {
    status: flowStatus(phase, execution.data, hasError),
    stage: currentStage,
    execution: execution.data,
    errorMessage: hasError
      ? errorText(create.error)
      : (execution.data?.errorMessage ?? undefined),
    needsDelegation: !delegation.isDelegated,
    isAuthenticated: session.isAuthenticated,
    review: () =>
      session.isAuthenticated ? setPhase("confirming") : session.login(),
    confirm: () => {
      setPhase("submitting");
      create.mutate();
    },
    dismiss: reset,
    finish: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: ["origin-balances"] });
    },
  };
}

export type BridgeDepositController = ReturnType<typeof useBridgeDeposit>;
