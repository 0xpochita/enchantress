import { after, NextResponse } from "next/server";
import { createBridgeDeposit } from "@/features/bridge/services/create-bridge-deposit";
import { createBridgeDepositBodySchema } from "@/features/bridge/types";
import { advanceExecution } from "@/features/executions/services/runner";
import { requireUser } from "@/features/wallet/server";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = createBridgeDepositBodySchema.parse(await request.json());
    const result = await createBridgeDeposit(user, body);
    if (result.execution.status === "executing")
      after(() => advanceExecution(result.execution.id));
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
