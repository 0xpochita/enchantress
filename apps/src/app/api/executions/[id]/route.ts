import { NextResponse } from "next/server";
import {
  cancelExecution,
  getOwnedExecution,
} from "@/features/executions/services/execution-lifecycle";
import { requireUser } from "@/features/wallet/server";
import { apiErrorResponse } from "@/lib/api-error";

type Context = RouteContext<"/api/executions/[id]">;

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    return NextResponse.json(await getOwnedExecution(user, id));
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    return NextResponse.json(await cancelExecution(user, id));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
