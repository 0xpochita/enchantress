import { NextResponse } from "next/server";
import { type Address, parseUnits } from "viem";
import { AuroraError } from "@/features/bridge/services/aurora-client";
import type { BridgeTokenDetail } from "@/features/bridge/services/bridge-catalog";
import {
  getBridgeTokenDetail,
  MONAD_DIRECT_ASSETS,
} from "@/features/bridge/services/bridge-catalog";
import { previewBridgeQuote } from "@/features/bridge/services/bridge-quote";
import { quotePreviewBodySchema } from "@/features/bridge/types";
import { minimumAmountMessage } from "@/features/bridge/utils/minimum";
import { requireUser } from "@/features/wallet/server";
import { apiErrorResponse } from "@/lib/api-error";

function explainQuoteError(error: unknown, token: BridgeTokenDetail): unknown {
  if (!(error instanceof AuroraError)) return error;
  const minimum = minimumAmountMessage(
    error.message,
    token.decimals,
    token.symbol,
  );
  return minimum ? new AuroraError(400, minimum) : error;
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = quotePreviewBodySchema.parse(await request.json());
    const token = await getBridgeTokenDetail(body.originTokenId);
    if (!token || !user.walletAddress)
      return NextResponse.json(
        { error: "This token is not supported." },
        { status: 400 },
      );
    if (MONAD_DIRECT_ASSETS[token.assetId]) {
      const usd = Number(body.amount) * token.priceUsd;
      return NextResponse.json({
        amountOutBase: parseUnits(body.amount, token.decimals).toString(),
        amountOutUsd: usd,
        amountInUsd: usd,
        timeEstimateSeconds: 0,
      });
    }
    const preview = await previewBridgeQuote(
      token,
      body.amount,
      user.walletAddress as Address,
    ).catch((error: unknown) => {
      throw explainQuoteError(error, token);
    });
    return NextResponse.json(preview);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
