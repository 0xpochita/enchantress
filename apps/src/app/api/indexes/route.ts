import { NextResponse } from "next/server";
import { createIndex } from "@/features/indexes/services/create-index";
import { createIndexBodySchema } from "@/features/indexes/types";
import { requireUser } from "@/features/wallet/server";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = createIndexBodySchema.parse(await request.json());
    return NextResponse.json(await createIndex(user, body), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
