"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { useDelegation, useSession } from "@/features/wallet";
import { ApiError, apiGet, apiPost } from "@/lib/api-client";
import type { FlowStatus } from "@/types/flow";
import { type ExecutionView, executionViewSchema } from "../types";

const DEPOSIT_TOKEN = { symbol: "USDC", iconKey: "usdc", decimals: 6 } as const;
const POLL_MS = 4000;

const balancesSchema = z.object({
  balances: z.array(
    z.object({
      symbol: z.string(),
      amountBase: z.string(),
      amount: z.number(),
    }),
  ),
});

type Phase = "idle" | "confirming" | "submitting" | "tracking";

function flowStatus(
  phase: Phase,
  execution?: ExecutionView,
  error?: string,
): FlowStatus {
  if (phase === "idle") return "idle";
  if (phase === "confirming") return "confirming";
  if (error) return "failed";
  if (execution?.status === "succeeded") return "success";
  if (execution?.status === "failed") return "failed";
  return "pending";
}

function errorText(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Something went wrong.";
}

export function useIndexDeposit(indexId: string) {
  const session = useSession();
  const delegation = useDelegation();
  const { getAccessToken } = usePrivy();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [executionId, setExecutionId] = useState<string | null>(null);
  const withToken = async <T>(call: (token: string) => Promise<T>) => {
    const token = await getAccessToken();
    if (!token) throw new ApiError(401, "Please log in again.");
    return call(token);
  };
  const balances = useQuery({
    queryKey: ["balances"],
    queryFn: () =>
      withToken((token) => apiGet("/api/balances", balancesSchema, token)),
    enabled: session.isAuthenticated,
    staleTime: 15_000,
  });
  const execution = useQuery({
    queryKey: ["execution", executionId],
    queryFn: () =>
      withToken((token) =>
        apiGet(`/api/executions/${executionId}`, executionViewSchema, token),
      ),
    enabled: executionId !== null,
    refetchInterval: (query) =>
      query.state.data?.status === "executing" ? POLL_MS : false,
  });
  const create = useMutation({
    mutationFn: async () => {
      if (!delegation.isDelegated) await delegation.enable();
      return withToken((token) =>
        apiPost(
          "/api/executions",
          { indexId, depositAsset: DEPOSIT_TOKEN.symbol, amount },
          executionViewSchema,
          token,
        ),
      );
    },
    onSuccess: (view) => {
      setExecutionId(view.id);
      setPhase("tracking");
    },
  });
  const reset = () => {
    setPhase("idle");
    setExecutionId(null);
    create.reset();
  };
  const finish = () => {
    reset();
    setAmount("");
    queryClient.invalidateQueries({ queryKey: ["balances"] });
  };
  const balance = balances.data?.balances.find(
    (b) => b.symbol === DEPOSIT_TOKEN.symbol,
  )?.amount;
  const errorMessage = create.error
    ? errorText(create.error)
    : (execution.data?.errorMessage ?? undefined);
  return {
    token: DEPOSIT_TOKEN,
    amount,
    setAmount,
    valueUsd: Number(amount) || 0,
    balance,
    isBalanceLoading: balances.isPending && session.isAuthenticated,
    isAuthenticated: session.isAuthenticated,
    login: session.login,
    needsDelegation: !delegation.isDelegated,
    status: flowStatus(
      phase,
      execution.data,
      create.error ? errorMessage : undefined,
    ),
    execution: execution.data,
    errorMessage,
    review: () =>
      session.isAuthenticated ? setPhase("confirming") : session.login(),
    confirm: () => {
      setPhase("submitting");
      create.mutate();
    },
    dismiss: reset,
    finish,
  };
}

export type IndexDepositController = ReturnType<typeof useIndexDeposit>;
