"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSession } from "@/features/wallet";
import { apiGet, apiPost } from "@/lib/api-client";
import { executionViewSchema, indexPositionSchema } from "../types";
import { useAccessToken, useExecutionFlow } from "./useExecutionFlow";

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
  const withToken = useAccessToken();
  return useQuery({
    queryKey: ["index-position", indexId],
    queryFn: () =>
      withToken((token) =>
        apiGet(`/api/indexes/${indexId}/position`, indexPositionSchema, token),
      ),
    enabled: session.isAuthenticated,
    staleTime: 15_000,
  });
}

export function useIndexWithdraw(indexId: string) {
  const session = useSession();
  const position = useIndexPosition(indexId);
  const [choice, setChoice] = useState<WithdrawChoice>("50%");
  const fraction = FRACTIONS[choice];
  const flow = useExecutionFlow((token) =>
    apiPost(
      "/api/executions/withdraw",
      { indexId, fraction },
      executionViewSchema,
      token,
    ),
  );
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
