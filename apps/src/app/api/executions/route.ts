import { NextResponse } from "next/server";
import { startDeposit } from "@/features/executions/services/execution-lifecycle";
import { createExecutionBodySchema } from "@/features/executions/types";
import { requireUser } from "@/features/wallet/server";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = createExecutionBodySchema.parse(await request.json());
    return NextResponse.json(await startDeposit(user, body), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
