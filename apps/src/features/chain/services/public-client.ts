import "server-only";
import { createPublicClient, http, type PublicClient } from "viem";
import { MONAD_CHAIN } from "@/config/chains";
import { serverEnv } from "@/config/env.server";

let client: PublicClient | undefined;

function rpcUrl(): string | undefined {
  const env = serverEnv();
  return env.MONAD_RPC_URL ?? env.NEXT_PUBLIC_MONAD_RPC_URL;
}

export function monadClient(): PublicClient {
  client ??= createPublicClient({
    chain: MONAD_CHAIN,
    transport: http(rpcUrl(), { batch: true }),
    batch: { multicall: true },
  });
  return client;
}
