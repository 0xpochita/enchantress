import { NextResponse } from "next/server";
import { submitBridgeBodySchema } from "@/features/bridge/types";
import { submitBridgeDeposit } from "@/features/executions/services/execution-lifecycle";
import { requireUser } from "@/features/wallet/server";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/bridge/deposits/[id]/submit">,
) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const body = submitBridgeBodySchema.parse(await request.json());
    return NextResponse.json(await submitBridgeDeposit(user, id, body.txHash));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
