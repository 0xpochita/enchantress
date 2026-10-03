import { RAY } from "../../vaults/utils/aave-math.ts";

export interface Lot {
  indexId: string;
  venueId: string;
  assetSymbol: string;
  units: string;
}

export interface HoldingUnits {
  indexId: string;
  venueId: string;
  assetSymbol: string;
  units: bigint;
}

export interface MarketQuote {
  rateRay: bigint;
  decimals: number;
  priceUsd: number | undefined;
  apy: number;
}

export interface PositionValue {
  assets: bigint;
  amount: number;
  valueUsd: number;
  apy: number;
  priced: boolean;
}

export interface ValuedHolding {
  indexId: string;
  venueId: string;
  assetSymbol: string;
  amount: number;
  valueUsd: number;
  apy: number;
  priced: boolean;
}

const UNVALUED: PositionValue = {
  assets: 0n,
  amount: 0,
  valueUsd: 0,
  apy: 0,
  priced: false,
};

export function marketKey(venueId: string, assetSymbol: string): string {
  return `${venueId}:${assetSymbol}`;
}

export function aggregateLots(lots: Lot[]): HoldingUnits[] {
  const groups = new Map<string, HoldingUnits>();
  for (const lot of lots) {
    const key = `${lot.indexId}|${marketKey(lot.venueId, lot.assetSymbol)}`;
    const units = BigInt(lot.units);
    const current = groups.get(key);
    if (current) current.units += units;
    else groups.set(key, { ...lot, units });
  }
  return [...groups.values()].filter((holding) => holding.units > 0n);
}

export function unitsToAssets(units: bigint, rateRay: bigint): bigint {
  return (units * rateRay + RAY / 2n) / RAY;
}

export function toAmount(base: bigint, decimals: number): number {
  return Number(base) / 10 ** decimals;
}

export function valueUnits(
  units: bigint,
  quote: MarketQuote | undefined,
): PositionValue {
  if (!quote) return UNVALUED;
  const assets = unitsToAssets(units, quote.rateRay);
  const amount = toAmount(assets, quote.decimals);
  return {
    assets,
    amount,
    valueUsd: amount * (quote.priceUsd ?? 0),
    apy: quote.apy,
    priced: quote.priceUsd !== undefined,
  };
}

export function valueHoldings(
  holdings: HoldingUnits[],
  quotes: Map<string, MarketQuote>,
): ValuedHolding[] {
  return holdings.map(({ units, ...holding }) => {
    const quote = quotes.get(marketKey(holding.venueId, holding.assetSymbol));
    const { amount, valueUsd, apy, priced } = valueUnits(units, quote);
    return { ...holding, amount, valueUsd, apy, priced };
  });
}

export function sumByIndex(holdings: ValuedHolding[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const { indexId, valueUsd } of holdings)
    totals[indexId] = (totals[indexId] ?? 0) + valueUsd;
  return totals;
}
