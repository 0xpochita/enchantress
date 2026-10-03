import "server-only";
import { monadToken } from "@/features/chain/config/tokens";
import {
  createAdapter,
  getVenueSnapshot,
  type VenueSnapshot,
} from "@/features/vaults/services/venue-snapshot";
import {
  aggregateLots,
  type Lot,
  type MarketQuote,
  marketKey,
  toAmount,
  type ValuedHolding,
  valueHoldings,
} from "../utils/lots";

export interface MarketPair {
  venueId: string;
  assetSymbol: string;
}

export interface RatedPair extends MarketPair {
  rateRay: bigint;
}

export interface AssetValue {
  valueUsd: number;
  priced: boolean;
}

function toQuote(pair: RatedPair, snapshot: VenueSnapshot): MarketQuote[] {
  const token = monadToken(pair.assetSymbol);
  if (!token) return [];
  const market = snapshot.venues
    .find((venue) => venue.id === pair.venueId)
    ?.markets.find((m) => m.assetSymbol === pair.assetSymbol);
  const asset = snapshot.assets.find((a) => a.symbol === pair.assetSymbol);
  return [
    {
      rateRay: pair.rateRay,
      decimals: token.decimals,
      priceUsd: asset?.priceUsd,
      apy: market?.apy ?? 0,
    },
  ];
}

export async function quoteAtRates(
  pairs: RatedPair[],
): Promise<Map<string, MarketQuote>> {
  if (pairs.length === 0) return new Map();
  const snapshot = await getVenueSnapshot();
  return new Map(
    pairs.flatMap((pair) =>
      toQuote(pair, snapshot).map(
        (quote) => [marketKey(pair.venueId, pair.assetSymbol), quote] as const,
      ),
    ),
  );
}

async function readRate(pair: MarketPair): Promise<RatedPair[]> {
  const adapter = createAdapter(pair.venueId);
  if (!adapter || !monadToken(pair.assetSymbol)) return [];
  return [{ ...pair, rateRay: await adapter.rate(pair.assetSymbol) }];
}

export async function readMarketQuotes(
  pairs: MarketPair[],
): Promise<Map<string, MarketQuote>> {
  const unique = new Map(
    pairs.map((pair) => [marketKey(pair.venueId, pair.assetSymbol), pair]),
  );
  const rated = await Promise.all([...unique.values()].map(readRate));
  return quoteAtRates(rated.flat());
}

export async function valueLots(lots: Lot[]): Promise<ValuedHolding[]> {
  const holdings = aggregateLots(lots);
  return valueHoldings(holdings, await readMarketQuotes(holdings));
}

export async function assetPriceUsd(
  symbol: string,
): Promise<number | undefined> {
  const { assets } = await getVenueSnapshot();
  return assets.find((asset) => asset.symbol === symbol)?.priceUsd;
}

export async function assetValueUsd(
  symbol: string,
  amountBase: bigint,
): Promise<AssetValue> {
  const token = monadToken(symbol);
  const price = await assetPriceUsd(symbol);
  if (!token || price === undefined) return { valueUsd: 0, priced: false };
  return {
    valueUsd: toAmount(amountBase, token.decimals) * price,
    priced: true,
  };
}
