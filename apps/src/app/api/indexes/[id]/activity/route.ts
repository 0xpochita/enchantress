import { NextResponse } from "next/server";
import { readIndexActivity } from "@/features/executions/services/index-activity";
import { indexActivitySchema } from "@/features/executions/types";
import { apiErrorResponse } from "@/lib/api-error";

type Context = RouteContext<"/api/indexes/[id]/activity">;

export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const activity = indexActivitySchema.parse(await readIndexActivity(id));
    return NextResponse.json(activity, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
