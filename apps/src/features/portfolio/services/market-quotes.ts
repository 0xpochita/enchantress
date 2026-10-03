import "server-only";
import { monadToken } from "@/features/chain/config/tokens";
import {
  createAdapter,
  getVenueSnapshot,
  type VenueSnapshot,
} from "@/features/vaults/services/venue-snapshot";
import { type MarketQuote, marketKey } from "../utils/lots";

interface MarketPair {
  venueId: string;
  assetSymbol: string;
}

async function readRate(pair: MarketPair): Promise<bigint | undefined> {
  const adapter = createAdapter(pair.venueId);
  if (!adapter || !monadToken(pair.assetSymbol)) return undefined;
  return adapter.rate(pair.assetSymbol);
}

async function quoteMarket(
  pair: MarketPair,
  snapshot: VenueSnapshot,
): Promise<MarketQuote | undefined> {
  const token = monadToken(pair.assetSymbol);
  const asset = snapshot.assets.find((a) => a.symbol === pair.assetSymbol);
  if (!token || !asset) return undefined;
  const rateRay = await readRate(pair);
  if (rateRay === undefined) return undefined;
  const market = snapshot.venues
    .find((venue) => venue.id === pair.venueId)
    ?.markets.find((m) => m.assetSymbol === pair.assetSymbol);
  return {
    rateRay,
    decimals: token.decimals,
    priceUsd: asset.priceUsd,
    apy: market?.apy ?? 0,
  };
}

export async function readMarketQuotes(
  pairs: MarketPair[],
): Promise<Map<string, MarketQuote>> {
  if (pairs.length === 0) return new Map();
  const snapshot = await getVenueSnapshot();
  const unique = new Map(
    pairs.map((pair) => [marketKey(pair.venueId, pair.assetSymbol), pair]),
  );
  const quotes = await Promise.all(
    [...unique].map(async ([key, pair]) => {
      const quote = await quoteMarket(pair, snapshot);
      return quote ? [[key, quote] as const] : [];
    }),
  );
  return new Map(quotes.flat());
}
