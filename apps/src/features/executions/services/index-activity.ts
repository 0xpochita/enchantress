import "server-only";
import type { IndexActivity } from "../types";
import { toActivityRow } from "../utils/activity";
import { indexLedger } from "./execution-repository";

const ACTIVITY_LIMIT = 50;

export async function readIndexActivity(
  indexId: string,
): Promise<IndexActivity> {
  const entries = await indexLedger(indexId, ACTIVITY_LIMIT);
  return { rows: entries.map(toActivityRow) };
}
