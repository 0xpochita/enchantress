export const RAY = 10n ** 27n;

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
  priceUsd: number;
  apy: number;
}

export interface ValuedHolding {
  indexId: string;
  venueId: string;
  assetSymbol: string;
  amount: number;
  valueUsd: number;
  apy: number;
}

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

export function valueHoldings(
  holdings: HoldingUnits[],
  quotes: Map<string, MarketQuote>,
): ValuedHolding[] {
  return holdings.flatMap(({ units, ...holding }) => {
    const quote = quotes.get(marketKey(holding.venueId, holding.assetSymbol));
    if (!quote) return [];
    const assets = unitsToAssets(units, quote.rateRay);
    const amount = Number(assets) / 10 ** quote.decimals;
    return [
      { ...holding, amount, valueUsd: amount * quote.priceUsd, apy: quote.apy },
    ];
  });
}

export function sumByIndex(holdings: ValuedHolding[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const { indexId, valueUsd } of holdings)
    totals[indexId] = (totals[indexId] ?? 0) + valueUsd;
  return totals;
}
