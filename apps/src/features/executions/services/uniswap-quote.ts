import "server-only";
import { serverEnv } from "@/config/env.server";
import { monadClient } from "@/features/chain/services/public-client";
import { quoteBestSwap, type SwapQuote } from "../utils/swap-quote";
import type { SwapQuoteRequest } from "./runner-ports";

export {
  NoLiquidityError,
  QuoteUnavailableError,
  type SwapQuote,
} from "../utils/swap-quote";

export function bestSwapQuote(request: SwapQuoteRequest): Promise<SwapQuote> {
  return quoteBestSwap(request, {
    client: monadClient(),
    maxDeviationBps: serverEnv().SWAP_MAX_ORACLE_DEVIATION_BPS,
  });
}
