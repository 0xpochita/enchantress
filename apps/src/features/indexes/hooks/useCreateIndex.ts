"use client";

import { useState } from "react";
import {
  type BridgeStartStage,
  bridgeStage,
  useStartBridgeDeposit,
} from "@/features/bridge";
import { useExecutionFlow } from "@/features/executions";
import type { IndexRecipe } from "@/utils/draft";
import { createIndexResponseSchema } from "../types";

interface CreateIndexInput {
  recipe: IndexRecipe;
  originTokenId: string;
  amount: string;
  onReset: () => void;
}

function useCreateFlow(input: CreateIndexInput, hasDeposit: boolean) {
  const [indexId, setIndexId] = useState<string | null>(null);
  const startDeposit = useStartBridgeDeposit();
  const flow = useExecutionFlow<BridgeStartStage>(async (context) => {
    const { id } = await context.api.post(
      "/api/indexes",
      input.recipe,
      createIndexResponseSchema,
    );
    setIndexId(id);
    if (!hasDeposit) return null;
    const { originTokenId, amount } = input;
    return startDeposit(context, { indexId: id, originTokenId, amount });
  });
  return { flow, indexId, clear: () => setIndexId(null) };
}

export function useCreateIndex(input: CreateIndexInput) {
  const hasDeposit = Number(input.amount) > 0;
  const { flow, indexId, clear } = useCreateFlow(input, hasDeposit);
  return {
    status: flow.status,
    indexId,
    hasDeposit,
    deposit: { ...flow, stage: bridgeStage(flow) },
    errorMessage: flow.errorMessage,
    isAuthenticated: flow.isAuthenticated,
    needsDelegation: hasDeposit && flow.needsDelegation,
    review: flow.review,
    confirm: () => {
      clear();
      flow.confirm();
    },
    dismiss: () => {
      clear();
      flow.dismiss();
    },
    finish: () => {
      clear();
      flow.finish();
      input.onReset();
    },
  };
}

export type CreateIndexController = ReturnType<typeof useCreateIndex>;
