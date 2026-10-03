import { NextResponse } from "next/server";
import { createBridgeDepositBodySchema } from "@/features/bridge/types";
import { startBridgeDeposit } from "@/features/executions/services/execution-lifecycle";
import { requireUser } from "@/features/wallet/server";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = createBridgeDepositBodySchema.parse(await request.json());
    const result = await startBridgeDeposit(user, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
