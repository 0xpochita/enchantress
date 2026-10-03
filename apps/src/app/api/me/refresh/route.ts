import { NextResponse } from "next/server";
import { requireUser, syncUser, toAccount } from "@/features/wallet/server";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    return NextResponse.json(toAccount(await syncUser(user.privyDid)));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
