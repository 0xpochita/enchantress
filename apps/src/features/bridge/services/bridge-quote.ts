import "server-only";
import { type Address, parseUnits } from "viem";
import type { QuotePreview } from "../types";
import {
  type AuroraQuote,
  fetchAuroraQuote,
  type QuoteRequest,
} from "./aurora-client";
import { type BridgeTokenDetail, MONAD_USDC_ASSET_ID } from "./bridge-catalog";

const SLIPPAGE_BPS = 100;

export type ReservedQuote = Omit<AuroraQuote, "deadline" | "depositAddress"> & {
  depositAddress: string;
  deadline: Date;
};
const QUOTE_TTL_MS = 10 * 60_000;

export class BridgeQuoteError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "BridgeQuoteError";
  }
}

function baseRequest(
  token: BridgeTokenDetail,
  amount: string,
  wallet: Address,
): Omit<QuoteRequest, "dry"> {
  return {
    swapType: "EXACT_INPUT",
    depositType: "ORIGIN_CHAIN",
    amount: parseUnits(amount, token.decimals).toString(),
    originAsset: token.assetId,
    destinationAsset: MONAD_USDC_ASSET_ID,
    slippageTolerance: SLIPPAGE_BPS,
    refundTo: wallet,
    refundType: "ORIGIN_CHAIN",
    recipient: wallet,
    recipientType: "DESTINATION_CHAIN",
  };
}

export async function previewBridgeQuote(
  token: BridgeTokenDetail,
  amount: string,
  wallet: Address,
): Promise<QuotePreview> {
  const quote = await fetchAuroraQuote({
    ...baseRequest(token, amount, wallet),
    dry: true,
  });
  return {
    amountOutBase: quote.amountOut,
    amountOutUsd: Number(quote.amountOutUsd),
    amountInUsd: Number(quote.amountInUsd),
    timeEstimateSeconds: quote.timeEstimate,
  };
}

export async function requestBridgeQuote(
  token: BridgeTokenDetail,
  amount: string,
  wallet: Address,
): Promise<ReservedQuote> {
  const quote = await fetchAuroraQuote({
    ...baseRequest(token, amount, wallet),
    dry: false,
    deadline: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
  });
  if (!quote.depositAddress)
    throw new BridgeQuoteError(502, "Aurora did not return a deposit address.");
  return {
    ...quote,
    depositAddress: quote.depositAddress,
    deadline: quote.deadline
      ? new Date(quote.deadline)
      : new Date(Date.now() + QUOTE_TTL_MS),
  };
}
