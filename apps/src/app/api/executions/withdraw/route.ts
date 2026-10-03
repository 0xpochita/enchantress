import { after, NextResponse } from "next/server";
import { createWithdraw } from "@/features/executions/services/create-withdraw";
import { advanceExecution } from "@/features/executions/services/runner";
import { createWithdrawBodySchema } from "@/features/executions/types";
import { requireUser } from "@/features/wallet/server";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = createWithdrawBodySchema.parse(await request.json());
    const execution = await createWithdraw(user, body);
    after(() => advanceExecution(execution.id));
    return NextResponse.json(execution, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
