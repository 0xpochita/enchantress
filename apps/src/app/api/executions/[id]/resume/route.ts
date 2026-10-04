import { NextResponse } from "next/server";
import { resumeExecution } from "@/features/executions/services/execution-lifecycle";
import { requireUser } from "@/features/wallet/server";
import { apiErrorResponse } from "@/lib/api-error";

type Context = RouteContext<"/api/executions/[id]/resume">;

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    return NextResponse.json(await resumeExecution(user, id));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
