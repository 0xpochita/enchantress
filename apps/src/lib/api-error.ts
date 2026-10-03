import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError } from "@/features/wallet/server";

interface HttpError {
  status: number;
  message: string;
}

function asHttpError(error: unknown): HttpError | null {
  if (error instanceof UnauthorizedError)
    return { status: 401, message: "Please log in again." };
  if (error instanceof ZodError)
    return {
      status: 400,
      message: error.issues[0]?.message ?? "Invalid request.",
    };
  if (
    error instanceof Error &&
    "status" in error &&
    typeof error.status === "number"
  )
    return { status: error.status, message: error.message };
  return null;
}

export function apiErrorResponse(error: unknown): NextResponse {
  const known = asHttpError(error);
  if (!known) throw error;
  return NextResponse.json({ error: known.message }, { status: known.status });
}
