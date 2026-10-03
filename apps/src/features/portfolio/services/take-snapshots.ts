import "server-only";
import { aggregateLots, valueHoldings } from "../utils/lots";
import { buildPositions } from "../utils/positions";
import { snapshotDate, snapshotRow } from "../utils/snapshots";
import { readMarketQuotes } from "./market-quotes";
import { allLots, upsertSnapshots } from "./portfolio-repository";

export async function takeSnapshots(now: Date): Promise<number> {
  const lots = await allLots();
  const quotes = await readMarketQuotes(lots);
  const takenAt = snapshotDate(now);
  const rows = [...Map.groupBy(lots, (lot) => lot.userId)].map(
    ([userId, owned]) =>
      snapshotRow(
        userId,
        takenAt,
        buildPositions(valueHoldings(aggregateLots(owned), quotes), new Map()),
      ),
  );
  await upsertSnapshots(rows);
  return rows.length;
}
