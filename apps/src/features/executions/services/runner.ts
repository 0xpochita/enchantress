import "server-only";
import { serverEnv } from "@/config/env.server";
import { advanceBridging } from "@/features/bridge/services/bridge-lifecycle";
import { monadClient } from "@/features/chain/services/public-client";
import {
  assetPriceUsd,
  assetValueUsd,
} from "@/features/portfolio/services/valuation";
import { createAdapter } from "@/features/vaults/services/venue-snapshot";
import { advanceWith } from "./execution-runner";
import { executionStore } from "./execution-store";
import { readTransactionState, sendMonadTransaction } from "./privy-sender";
import type { RunnerPorts } from "./runner-ports";
import { bestSwapQuote } from "./uniswap-quote";

const productionPorts: RunnerPorts = {
  store: executionStore,
  sender: { send: sendMonadTransaction, state: readTransactionState },
  chain: {
    receipt: (hash) => monadClient().getTransactionReceipt({ hash }),
    adapter: createAdapter,
  },
  prices: { priceUsd: assetPriceUsd, valueUsd: assetValueUsd },
  swaps: {
    quote: bestSwapQuote,
    slippageBps: () => serverEnv().SWAP_SLIPPAGE_BPS,
  },
  advanceBridging,
};

export function advanceExecution(id: string): Promise<void> {
  return advanceWith(productionPorts, id);
}
