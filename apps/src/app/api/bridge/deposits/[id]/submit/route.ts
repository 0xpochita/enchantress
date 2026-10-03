import { after, NextResponse } from "next/server";
import { submitBridgeTransfer } from "@/features/bridge/services/bridge-lifecycle";
import { submitBridgeBodySchema } from "@/features/bridge/types";
import { advanceExecution } from "@/features/executions/services/runner";
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
    const view = await submitBridgeTransfer(user, id, body.txHash);
    after(() => advanceExecution(id));
    return NextResponse.json(view);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
