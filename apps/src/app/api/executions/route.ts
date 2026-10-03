import { after, NextResponse } from "next/server";
import { createDeposit } from "@/features/executions/services/create-deposit";
import { advanceExecution } from "@/features/executions/services/runner";
import { createExecutionBodySchema } from "@/features/executions/types";
import { requireUser } from "@/features/wallet/server";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = createExecutionBodySchema.parse(await request.json());
    const execution = await createDeposit(user, body);
    after(() => advanceExecution(execution.id));
    return NextResponse.json(execution, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
