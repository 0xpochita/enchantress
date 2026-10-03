import "server-only";
import { createPublicClient, http, type PublicClient } from "viem";
import { originChainById } from "@/config/chains";
import { serverEnv } from "@/config/env.server";

const clients = new Map<string, PublicClient>();

function rpcOverride(chainId: string): string | undefined {
  const env = serverEnv();
  const overrides: Record<string, string | undefined> = {
    monad: env.MONAD_RPC_URL ?? env.NEXT_PUBLIC_MONAD_RPC_URL,
    eth: env.ETHEREUM_RPC_URL,
    base: env.BASE_RPC_URL,
    arb: env.ARBITRUM_RPC_URL,
  };
  return overrides[chainId];
}

export function originChainClient(chainId: string): PublicClient {
  const origin = originChainById(chainId);
  if (!origin) throw new Error(`Unsupported chain ${chainId}`);
  let client = clients.get(chainId);
  if (!client) {
    client = createPublicClient({
      chain: origin.chain,
      transport: http(rpcOverride(chainId), { batch: true }),
      batch: { multicall: true },
    });
    clients.set(chainId, client);
  }
  return client;
}

export function monadClient(): PublicClient {
  return originChainClient("monad");
}
