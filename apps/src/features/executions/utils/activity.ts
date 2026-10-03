import { monadToken } from "../../chain/config/tokens.ts";
import type { ActivityRow } from "../types.ts";

const DEFAULT_DECIMALS = 18;

export interface LedgerEntry {
  id: string;
  direction: string;
  venueId: string;
  assetSymbol: string;
  amountBase: string;
  valueUsd: string;
  txHash: string;
  account: string | null;
  at: Date;
}

export function baseToAmount(symbol: string, base: bigint): number {
  const decimals = monadToken(symbol)?.decimals ?? DEFAULT_DECIMALS;
  return Number(base) / 10 ** decimals;
}

export function toActivityRow(entry: LedgerEntry): ActivityRow {
  return {
    id: entry.id,
    direction: entry.direction === "out" ? "out" : "in",
    venueId: entry.venueId,
    assetSymbol: entry.assetSymbol,
    amount: baseToAmount(entry.assetSymbol, BigInt(entry.amountBase)),
    valueUsd: Number(entry.valueUsd),
    account: entry.account,
    txHash: entry.txHash,
    at: entry.at.toISOString(),
  };
}
