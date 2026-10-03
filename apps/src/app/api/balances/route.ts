import { NextResponse } from "next/server";
import type { Address } from "viem";
import { readTokenBalances } from "@/features/chain/services/balances";
import { requireUser } from "@/features/wallet/server";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user.walletAddress) return NextResponse.json({ balances: [] });
    const balances = await readTokenBalances(user.walletAddress as Address);
    return NextResponse.json({ balances });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
