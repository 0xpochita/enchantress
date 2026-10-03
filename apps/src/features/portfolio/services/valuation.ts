import "server-only";
import {
  aggregateLots,
  type Lot,
  type ValuedHolding,
  valueHoldings,
} from "../utils/lots";
import { readMarketQuotes } from "./market-quotes";

export async function valueLots(lots: Lot[]): Promise<ValuedHolding[]> {
  const holdings = aggregateLots(lots);
  return valueHoldings(holdings, await readMarketQuotes(holdings));
}
