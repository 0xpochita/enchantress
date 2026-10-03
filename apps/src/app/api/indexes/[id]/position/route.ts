import { NextResponse } from "next/server";
import { previewIndexPosition } from "@/features/executions/services/create-withdraw";
import { requireUser } from "@/features/wallet/server";
import { apiErrorResponse } from "@/lib/api-error";

type Context = RouteContext<"/api/indexes/[id]/position">;

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    return NextResponse.json(await previewIndexPosition(user, id), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
