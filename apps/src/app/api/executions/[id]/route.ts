import { after, NextResponse } from "next/server";
import { cancelBridgeDeposit } from "@/features/bridge/services/bridge-lifecycle";
import {
  loadExecution,
  toExecutionView,
} from "@/features/executions/services/execution-repository";
import { advanceExecution } from "@/features/executions/services/runner";
import { ACTIVE_STATUSES } from "@/features/executions/types";
import { requireUser } from "@/features/wallet/server";
import { apiErrorResponse } from "@/lib/api-error";

type Context = RouteContext<"/api/executions/[id]">;

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const loaded = await loadExecution(id);
    if (!loaded || loaded.execution.userId !== user.id)
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    const isActive = (ACTIVE_STATUSES as readonly string[]).includes(
      loaded.execution.status,
    );
    if (isActive) after(() => advanceExecution(id));
    return NextResponse.json(toExecutionView(loaded));
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    return NextResponse.json(await cancelBridgeDeposit(user, id));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
