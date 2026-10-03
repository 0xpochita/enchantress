import { NextResponse } from "next/server";
import { serverEnv } from "@/config/env.server";
import { staleExecutionIds } from "@/features/executions/services/execution-repository";
import { advanceExecution } from "@/features/executions/services/runner";

export async function GET(request: Request) {
  const secret = serverEnv().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ids = await staleExecutionIds();
  for (const id of ids) await advanceExecution(id);
  return NextResponse.json({ resumed: ids.length });
}
