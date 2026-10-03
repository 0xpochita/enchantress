"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useDelegation, useSession } from "@/features/wallet";
import type { FlowStatus } from "@/types/flow";
import { ApiError, apiGet } from "@/lib/api-client";
import { type ExecutionView, executionViewSchema } from "../types";

const POLL_MS = 4000;

type Phase = "idle" | "confirming" | "submitting" | "tracking";

export type WithToken = <T>(call: (token: string) => Promise<T>) => Promise<T>;

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

export function useAccessToken(): WithToken {
  const { getAccessToken } = usePrivy();
  return async (call) => {
    const token = await getAccessToken();
    if (!token) throw new ApiError(401, "Please log in again.");
    return call(token);
  };
}

function useTrackedExecution(executionId: string | null) {
  const withToken = useAccessToken();
  return useQuery({
    queryKey: ["execution", executionId],
    queryFn: () =>
      withToken((token) =>
        apiGet(`/api/executions/${executionId}`, executionViewSchema, token),
      ),
    enabled: executionId !== null,
    refetchInterval: (query) =>
      query.state.data?.status === "executing" ? POLL_MS : false,
  });
}

const REFRESHED_QUERIES = ["balances", "index-position", "index-activity"];

function useStartExecution(start: (token: string) => Promise<ExecutionView>) {
  const delegation = useDelegation();
  const withToken = useAccessToken();
  const [phase, setPhase] = useState<Phase>("idle");
  const [executionId, setExecutionId] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: async () => {
      if (!delegation.isDelegated) await delegation.enable();
      return withToken(start);
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
  const begin = () => {
    setExecutionId(null);
    setPhase("submitting");
    create.mutate();
  };
  const needsDelegation = !delegation.isDelegated;
  return {
    phase,
    setPhase,
    executionId,
    begin,
    create,
    reset,
    needsDelegation,
  };
}

export function useExecutionFlow(
  start: (token: string) => Promise<ExecutionView>,
) {
  const session = useSession();
  const queryClient = useQueryClient();
  const run = useStartExecution(start);
  const execution = useTrackedExecution(run.executionId);
  const createError = run.create.error
    ? errorText(run.create.error)
    : undefined;
  return {
    isAuthenticated: session.isAuthenticated,
    needsDelegation: run.needsDelegation,
    status: flowStatus(run.phase, execution.data, createError),
    execution: execution.data,
    errorMessage: createError ?? execution.data?.errorMessage ?? undefined,
    review: () =>
      session.isAuthenticated ? run.setPhase("confirming") : session.login(),
    confirm: run.begin,
    dismiss: run.reset,
    finish: () => {
      run.reset();
      for (const key of REFRESHED_QUERIES)
        queryClient.invalidateQueries({ queryKey: [key] });
    },
  };
}

export type ExecutionFlow = ReturnType<typeof useExecutionFlow>;
