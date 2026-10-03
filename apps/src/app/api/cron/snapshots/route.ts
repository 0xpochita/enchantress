import { NextResponse } from "next/server";
import { serverEnv } from "@/config/env.server";
import { takeSnapshots } from "@/features/portfolio/server";

export async function GET(request: Request) {
  const secret = serverEnv().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ snapshots: await takeSnapshots(new Date()) });
}
