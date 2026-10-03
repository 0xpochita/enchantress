"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useReducer, useState } from "react";
import { useDelegation, useSession } from "@/features/wallet";
import { type Api, useApi } from "@/lib/api-client";
import { type ExecutionView, executionViewSchema } from "../types";
import {
  errorText,
  type FlowState,
  flowError,
  flowReducer,
  flowStatus,
  INITIAL_FLOW,
  shouldPoll,
} from "../utils/flow";

const POLL_MS = 4000;

const REFRESHED_QUERIES = [
  "balances",
  "origin-balances",
  "index-position",
  "portfolio",
  "index-activity",
];

export interface FlowContext<S extends string> {
  api: Api;
  setStage: (stage: S) => void;
  delegate: () => Promise<void>;
}

export type StartExecution<S extends string> = (
  context: FlowContext<S>,
) => Promise<ExecutionView | null>;

function useTrackedExecution(api: Api, state: FlowState) {
  return useQuery({
    queryKey: ["execution", state.executionId],
    queryFn: () =>
      api.get(`/api/executions/${state.executionId}`, executionViewSchema),
    enabled: state.phase === "tracking" && state.executionId !== null,
    refetchInterval: (query) =>
      shouldPoll(query.state.data?.status) ? POLL_MS : false,
  });
}

function useStart<S extends string>(start: StartExecution<S>, api: Api) {
  const delegation = useDelegation();
  const [state, dispatch] = useReducer(flowReducer, INITIAL_FLOW);
  const [stage, setStage] = useState<S | "permission">();
  const delegate = async () => {
    if (delegation.isDelegated) return;
    setStage("permission");
    await delegation.enable();
  };
  const begin = async () => {
    const attempt = state.attempt + 1;
    setStage(undefined);
    dispatch({ type: "start" });
    try {
      const view = await start({ api, setStage, delegate });
      dispatch({ type: "started", attempt, executionId: view?.id ?? null });
    } catch (error) {
      dispatch({ type: "failed", attempt, error: errorText(error) });
    }
  };
  const needsDelegation = !delegation.isDelegated;
  return { state, dispatch, stage, begin, needsDelegation };
}

export function useExecutionFlow<S extends string = never>(
  start: StartExecution<S>,
) {
  const session = useSession();
  const api = useApi();
  const queryClient = useQueryClient();
  const run = useStart(start, api);
  const execution = useTrackedExecution(api, run.state);
  const reset = () => {
    if (run.state.executionId)
      for (const key of REFRESHED_QUERIES)
        queryClient.invalidateQueries({ queryKey: [key] });
    run.dispatch({ type: "reset" });
  };
  return {
    isAuthenticated: session.isAuthenticated,
    needsDelegation: run.needsDelegation,
    phase: run.state.phase,
    stage: run.stage,
    status: flowStatus(run.state, execution.data),
    execution: execution.data,
    errorMessage: flowError(run.state, execution.data),
    review: () =>
      session.isAuthenticated
        ? run.dispatch({ type: "review" })
        : session.login(),
    confirm: () => void run.begin(),
    dismiss: reset,
    finish: reset,
  };
}

export type ExecutionFlow<S extends string = never> = ReturnType<
  typeof useExecutionFlow<S>
>;
