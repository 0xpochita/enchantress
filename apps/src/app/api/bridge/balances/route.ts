import { NextResponse } from "next/server";
import type { Address } from "viem";
import { getBridgeSource } from "@/features/bridge/services/bridge-catalog";
import { readOriginBalances } from "@/features/bridge/services/origin-balances";
import { requireUser } from "@/features/wallet/server";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user.walletAddress) return NextResponse.json({ balances: [] });
    const source = await getBridgeSource();
    const balances = await readOriginBalances(
      user.walletAddress as Address,
      Object.values(source.details),
    );
    return NextResponse.json({ balances });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
