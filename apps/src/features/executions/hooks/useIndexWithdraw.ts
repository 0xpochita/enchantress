"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSession } from "@/features/wallet";
import { useApi } from "@/lib/api-client";
import { executionViewSchema, indexPositionSchema } from "../types";
import { useExecutionFlow } from "./useExecutionFlow";

export const WITHDRAW_CHOICES = ["25%", "50%", "75%", "Max"] as const;

export type WithdrawChoice = (typeof WITHDRAW_CHOICES)[number];

const FRACTIONS: Record<WithdrawChoice, number> = {
  "25%": 0.25,
  "50%": 0.5,
  "75%": 0.75,
  Max: 1,
};

function useIndexPosition(indexId: string) {
  const session = useSession();
  const api = useApi();
  return useQuery({
    queryKey: ["index-position", indexId],
    queryFn: () =>
      api.get(`/api/indexes/${indexId}/position`, indexPositionSchema),
    enabled: session.isAuthenticated,
    staleTime: 15_000,
  });
}

export function useIndexWithdraw(indexId: string) {
  const session = useSession();
  const position = useIndexPosition(indexId);
  const [choice, setChoice] = useState<WithdrawChoice>("50%");
  const fraction = FRACTIONS[choice];
  const flow = useExecutionFlow(async ({ api, delegate }) => {
    await delegate();
    return api.post(
      "/api/executions/withdraw",
      { indexId, fraction },
      executionViewSchema,
    );
  });
  const positionUsd = position.data?.valueUsd ?? 0;
  return {
    ...flow,
    login: session.login,
    choice,
    setChoice,
    fraction,
    holdings: position.data?.holdings ?? [],
    positionUsd,
    valueUsd: positionUsd * fraction,
    isPositionLoading: position.isPending && session.isAuthenticated,
  };
}

export type IndexWithdrawController = ReturnType<typeof useIndexWithdraw>;
