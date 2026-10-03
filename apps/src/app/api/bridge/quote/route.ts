import { NextResponse } from "next/server";
import { type Address, parseUnits } from "viem";
import {
  getBridgeTokenDetail,
  MONAD_DIRECT_ASSETS,
} from "@/features/bridge/services/bridge-catalog";
import { previewBridgeQuote } from "@/features/bridge/services/bridge-quote";
import { quotePreviewBodySchema } from "@/features/bridge/types";
import { requireUser } from "@/features/wallet/server";
import { apiErrorResponse } from "@/lib/api-error";

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
    );
    return NextResponse.json(preview);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
