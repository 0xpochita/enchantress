"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useBridgeDeposit } from "@/features/bridge";
import { useSession } from "@/features/wallet";
import { ApiError, apiPost } from "@/lib/api-client";
import type { FlowStatus } from "@/types/flow";
import type { IndexRecipe } from "@/utils/draft";
import { createIndexResponseSchema } from "../types";

type Phase = "idle" | "confirming" | "creating" | "created" | "depositing";

interface CreateIndexInput {
  recipe: IndexRecipe;
  originTokenId: string;
  amount: string;
  onReset: () => void;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function flowStatus(
  phase: Phase,
  hasCreateError: boolean,
  depositStatus: FlowStatus,
): FlowStatus {
  if (phase === "idle" || phase === "confirming") return phase;
  if (hasCreateError) return "failed";
  if (phase === "created") return "success";
  if (phase === "depositing" && depositStatus !== "idle") return depositStatus;
  return "pending";
}

function usePostIndex(recipe: IndexRecipe, onCreated: (id: string) => void) {
  const { getAccessToken } = usePrivy();
  return useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new ApiError(401, "Please log in again.");
      return apiPost("/api/indexes", recipe, createIndexResponseSchema, token);
    },
    onSuccess: ({ id }) => onCreated(id),
  });
}

function useStartDeposit(shouldStart: boolean, start: () => void) {
  const hasStarted = useRef(false);
  useEffect(() => {
    if (!shouldStart || hasStarted.current) return;
    hasStarted.current = true;
    start();
  }, [shouldStart, start]);
  return () => {
    hasStarted.current = false;
  };
}

export function useCreateIndex(input: CreateIndexInput) {
  const session = useSession();
  const [phase, setPhase] = useState<Phase>("idle");
  const [indexId, setIndexId] = useState<string | null>(null);
  const hasDeposit = Number(input.amount) > 0;
  const deposit = useBridgeDeposit({
    indexId: indexId ?? undefined,
    originTokenId: input.originTokenId,
    amount: input.amount,
  });
  const create = usePostIndex(input.recipe, (id) => {
    setIndexId(id);
    setPhase(hasDeposit ? "depositing" : "created");
  });
  const rearmDeposit = useStartDeposit(
    phase === "depositing" && indexId !== null,
    deposit.confirm,
  );
  const reset = () => {
    setPhase("idle");
    setIndexId(null);
    rearmDeposit();
    create.reset();
    deposit.dismiss();
  };
  return {
    status: flowStatus(phase, create.isError, deposit.status),
    indexId,
    hasDeposit,
    deposit,
    errorMessage: create.isError
      ? errorText(create.error)
      : deposit.errorMessage,
    isAuthenticated: session.isAuthenticated,
    needsDelegation: hasDeposit && deposit.needsDelegation,
    review: () =>
      session.isAuthenticated ? setPhase("confirming") : session.login(),
    confirm: () => {
      setPhase("creating");
      create.mutate();
    },
    dismiss: reset,
    finish: () => {
      if (phase === "depositing") deposit.finish();
      reset();
      input.onReset();
    },
  };
}

export type CreateIndexController = ReturnType<typeof useCreateIndex>;
