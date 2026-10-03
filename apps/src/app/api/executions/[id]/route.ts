import { after, NextResponse } from "next/server";
import {
  loadExecution,
  toExecutionView,
} from "@/features/executions/services/execution-repository";
import { advanceExecution } from "@/features/executions/services/runner";
import { requireUser } from "@/features/wallet/server";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/executions/[id]">,
) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const loaded = await loadExecution(id);
    if (!loaded || loaded.execution.userId !== user.id)
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (loaded.execution.status === "executing")
      after(() => advanceExecution(id));
    return NextResponse.json(toExecutionView(loaded));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
