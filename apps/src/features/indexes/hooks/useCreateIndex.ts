"use client";

import { useRef, useState } from "react";
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

interface CreatedIndex {
  id: string;
  recipeKey: string;
}

function useCreatedIndex(recipe: IndexRecipe) {
  const created = useRef<CreatedIndex | null>(null);
  const recipeKey = JSON.stringify(recipe);
  const reusable = () =>
    created.current?.recipeKey === recipeKey ? created.current.id : null;
  const remember = (id: string) => {
    created.current = { id, recipeKey };
  };
  const forget = () => {
    created.current = null;
  };
  return { reusable, remember, forget };
}

function useCreateFlow(input: CreateIndexInput, hasDeposit: boolean) {
  const [indexId, setIndexId] = useState<string | null>(null);
  const created = useCreatedIndex(input.recipe);
  const startDeposit = useStartBridgeDeposit();
  const flow = useExecutionFlow<BridgeStartStage>(async (context) => {
    const id =
      created.reusable() ??
      (
        await context.api.post(
          "/api/indexes",
          input.recipe,
          createIndexResponseSchema,
        )
      ).id;
    created.remember(id);
    setIndexId(id);
    if (!hasDeposit) return null;
    const { originTokenId, amount } = input;
    return startDeposit(context, { indexId: id, originTokenId, amount });
  });
  return {
    flow,
    indexId,
    clear: () => setIndexId(null),
    forget: created.forget,
  };
}

export function useCreateIndex(input: CreateIndexInput) {
  const hasDeposit = Number(input.amount) > 0;
  const { flow, indexId, clear, forget } = useCreateFlow(input, hasDeposit);
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
      forget();
      flow.finish();
      input.onReset();
    },
  };
}

export type CreateIndexController = ReturnType<typeof useCreateIndex>;
