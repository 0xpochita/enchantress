import "server-only";
import { parseAbi } from "viem";
import { erc4626Abi } from "@/features/chain/abis/erc4626";
import {
  type MonadTokenSymbol,
  monadToken,
} from "@/features/chain/config/tokens";
import { monadClient } from "@/features/chain/services/public-client";
import { VENUE_CONFIGS } from "@/features/vaults/config/venues";
import {
  getVenueSnapshot,
  type VenueSnapshot,
} from "@/features/vaults/services/venue-snapshot";
import { type MarketQuote, marketKey, RAY } from "../utils/lots";

const normalizedIncomeAbi = parseAbi([
  "function getReserveNormalizedIncome(address asset) view returns (uint256)",
]);

interface MarketPair {
  venueId: string;
  assetSymbol: string;
}

async function readRate(pair: MarketPair): Promise<bigint | undefined> {
  const config = VENUE_CONFIGS.find((c) => c.id === pair.venueId);
  const token = monadToken(pair.assetSymbol);
  if (!config || !token) return undefined;
  if (config.kind === "aave-pool")
    return monadClient().readContract({
      address: config.pool,
      abi: normalizedIncomeAbi,
      functionName: "getReserveNormalizedIncome",
      args: [token.address],
    });
  const vault = config.vaults[pair.assetSymbol as MonadTokenSymbol];
  if (!vault) return undefined;
  return monadClient().readContract({
    address: vault,
    abi: erc4626Abi,
    functionName: "convertToAssets",
    args: [RAY],
  });
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
