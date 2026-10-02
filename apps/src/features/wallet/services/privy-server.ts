import "server-only";
import { PrivyClient } from "@privy-io/node";
import { serverEnv } from "@/config/env.server";

let client: PrivyClient | undefined;

export function privyServer(): PrivyClient {
  const env = serverEnv();
  client ??= new PrivyClient({
    appId: env.NEXT_PUBLIC_PRIVY_APP_ID,
    appSecret: env.PRIVY_APP_SECRET,
  });
  return client;
}
