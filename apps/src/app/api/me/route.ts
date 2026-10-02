import { NextResponse } from "next/server";
import {
  requireUser,
  toAccount,
  UnauthorizedError,
} from "@/features/wallet/server";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return NextResponse.json(toAccount(user));
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) throw error;
    return NextResponse.json(
      { error: "Please log in again." },
      { status: 401 },
    );
  }
}
