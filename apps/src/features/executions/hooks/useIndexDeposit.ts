"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { useSession } from "@/features/wallet";
import { apiGet, apiPost } from "@/lib/api-client";
import { executionViewSchema } from "../types";
import { useAccessToken, useExecutionFlow } from "./useExecutionFlow";

const DEPOSIT_TOKEN = { symbol: "USDC", iconKey: "usdc", decimals: 6 } as const;

const balancesSchema = z.object({
  balances: z.array(
    z.object({
      symbol: z.string(),
      amountBase: z.string(),
      amount: z.number(),
    }),
  ),
});

function useBalances() {
  const session = useSession();
  const withToken = useAccessToken();
  const balances = useQuery({
    queryKey: ["balances"],
    queryFn: () =>
      withToken((token) => apiGet("/api/balances", balancesSchema, token)),
    enabled: session.isAuthenticated,
    staleTime: 15_000,
  });
  return {
    balance: balances.data?.balances.find(
      (b) => b.symbol === DEPOSIT_TOKEN.symbol,
    )?.amount,
    isBalanceLoading: balances.isPending && session.isAuthenticated,
  };
}

export function useIndexDeposit(indexId: string) {
  const session = useSession();
  const [amount, setAmount] = useState("");
  const flow = useExecutionFlow((token) =>
    apiPost(
      "/api/executions",
      { indexId, depositAsset: DEPOSIT_TOKEN.symbol, amount },
      executionViewSchema,
      token,
    ),
  );
  return {
    ...flow,
    ...useBalances(),
    token: DEPOSIT_TOKEN,
    amount,
    setAmount,
    valueUsd: Number(amount) || 0,
    login: session.login,
    finish: () => {
      flow.finish();
      setAmount("");
    },
  };
}

export type IndexDepositController = ReturnType<typeof useIndexDeposit>;
