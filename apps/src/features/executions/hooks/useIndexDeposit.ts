"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { useSession } from "@/features/wallet";
import { useApi } from "@/lib/api-client";
import { executionViewSchema } from "../types";
import { useExecutionFlow } from "./useExecutionFlow";

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
  const api = useApi();
  const balances = useQuery({
    queryKey: ["balances"],
    queryFn: () => api.get("/api/balances", balancesSchema),
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
  const flow = useExecutionFlow(async ({ api, delegate }) => {
    await delegate();
    return api.post(
      "/api/executions",
      { indexId, depositAsset: DEPOSIT_TOKEN.symbol, amount },
      executionViewSchema,
    );
  });
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
