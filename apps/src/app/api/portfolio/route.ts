import { NextResponse } from "next/server";
import { getPortfolio } from "@/features/portfolio/server";
import { requireUser } from "@/features/wallet/server";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return NextResponse.json(await getPortfolio(user.id), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
