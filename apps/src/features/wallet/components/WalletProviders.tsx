"use client";

import {
  addRpcUrlOverrideToChain,
  type PrivyClientConfig,
  PrivyProvider,
} from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { MONAD_CHAIN, ORIGIN_CHAINS } from "@/config/chains";
import { readClientEnv } from "@/config/env.client";

const LOGIN_METHODS: PrivyClientConfig["loginMethods"] = ["email", "google"];

let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (typeof window === "undefined") return new QueryClient();
  browserQueryClient ??= new QueryClient();
  return browserQueryClient;
}

function monadChain(rpcUrl: string | undefined) {
  return rpcUrl ? addRpcUrlOverrideToChain(MONAD_CHAIN, rpcUrl) : MONAD_CHAIN;
}

export function WalletProviders({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const env = readClientEnv();
  if (!env.success)
    throw new Error(
      "Wallet is not configured: set NEXT_PUBLIC_PRIVY_APP_ID in apps/.env.local.",
    );
  const chain = monadChain(env.data.NEXT_PUBLIC_MONAD_RPC_URL);
  return (
    <PrivyProvider
      appId={env.data.NEXT_PUBLIC_PRIVY_APP_ID}
      clientId={env.data.NEXT_PUBLIC_PRIVY_CLIENT_ID}
      config={{
        appearance: {
          theme: resolvedTheme === "dark" ? "dark" : "light",
          walletChainType: "ethereum-only",
        },
        loginMethods: LOGIN_METHODS,
        embeddedWallets: { ethereum: { createOnLogin: "all-users" } },
        defaultChain: chain,
        supportedChains: [
          chain,
          ...ORIGIN_CHAINS.filter((c) => c.id !== "monad").map((c) => c.chain),
        ],
      }}
    >
      <QueryClientProvider client={getQueryClient()}>
        {children}
      </QueryClientProvider>
    </PrivyProvider>
  );
}
