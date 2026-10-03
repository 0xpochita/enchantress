import type { Chain, Token } from "../../../types/market";

export interface CatalogSourceToken {
  assetId: string;
  blockchain: string;
  symbol: string;
  price: number;
  decimals: number;
  contractAddress?: string | null;
}

export interface CatalogChain {
  id: string;
  name: string;
  iconKey: string;
  auroraCode: string;
}

export interface BridgeCatalog {
  chains: Chain[];
  tokens: Token[];
  popularTokenIds: string[];
}

const ICON_BY_SYMBOL: Record<string, string> = {
  USDC: "usdc",
  USDT: "usdt",
  USDT0: "usdt",
  ETH: "eth",
  WETH: "eth",
  DAI: "dai",
  WBTC: "wbtc",
  CBBTC: "/crypto/cbbtc.png",
  MON: "monad",
  WMON: "monad",
  ARB: "arb",
  LINK: "link",
  UNI: "uni",
  AAVE: "/crypto/aave.png",
  AUSD: "/crypto/ausd.png",
  ADI: "/crypto/adi.png",
  AURORA: "/crypto/aurora.png",
  BRETT: "/crypto/brett.png",
  CFI: "/crypto/cfi.png",
  COCA: "/crypto/coca.png",
  GMX: "/crypto/gmx.png",
  HAPI: "/crypto/hapi.png",
  HEMIBTC: "/crypto/hemibtc.jpg",
  INX: "/crypto/inx.png",
  KAITO: "/crypto/kaito.jpg",
  KNC: "/crypto/knc.jpg",
  MOG: "/crypto/mog.png",
  PEPE: "/crypto/pepe.jpg",
  SAFE: "/crypto/safe.png",
  SHIB: "/crypto/shib.png",
  SPX: "/crypto/spx.png",
  SWEAT: "/crypto/sweat.png",
  TITN: "/crypto/titn.png",
  TLO: "/crypto/tlo.jpg",
  TURBO: "/crypto/turbo.png",
  USD1: "/crypto/usd1.png",
  USDF: "/crypto/usdf.png",
  VVV: "/crypto/vvv.png",
  XAUT: "/crypto/xaut.png",
};

const POPULARITY = [
  "USDC",
  "USDT",
  "USDT0",
  "ETH",
  "WETH",
  "WBTC",
  "CBBTC",
  "MON",
  "DAI",
  "USD1",
  "LINK",
  "XAUT",
  "UNI",
  "AAVE",
  "ARB",
  "SHIB",
  "PEPE",
  "SAFE",
  "KAITO",
  "SPX",
  "GMX",
  "BRETT",
  "VVV",
  "MOG",
  "KNC",
  "USDF",
];

const POPULAR_SYMBOLS = new Set(["USDC", "ETH", "USDT"]);
const POPULAR_LIMIT = 6;

export function tokenIconKey(symbol: string): string {
  const key = symbol.toUpperCase();
  if (ICON_BY_SYMBOL[key]) return ICON_BY_SYMBOL[key];
  return key.endsWith("USDC") || key.startsWith("USDC") ? "usdc" : "generic";
}

function popularity(symbol: string): number {
  const rank = POPULARITY.indexOf(symbol.toUpperCase());
  return rank === -1 ? POPULARITY.length : rank;
}

function catalogTokens(
  chains: CatalogChain[],
  source: CatalogSourceToken[],
): Token[] {
  const byCode = new Map(chains.map((chain) => [chain.auroraCode, chain]));
  return source
    .flatMap((token) => {
      const chain = byCode.get(token.blockchain);
      if (!chain) return [];
      return [
        {
          id: token.assetId,
          symbol: token.symbol,
          name: token.symbol,
          chainId: chain.id,
          iconKey: tokenIconKey(token.symbol),
          priceUsd: token.price,
          address: token.contractAddress ?? null,
          decimals: token.decimals,
        },
      ];
    })
    .sort((a, b) => popularity(a.symbol) - popularity(b.symbol));
}

export function buildBridgeCatalog(
  chains: CatalogChain[],
  source: CatalogSourceToken[],
): BridgeCatalog {
  const tokens = catalogTokens(chains, source);
  const popularTokenIds = tokens
    .filter((token) => POPULAR_SYMBOLS.has(token.symbol.toUpperCase()))
    .slice(0, POPULAR_LIMIT)
    .map((token) => token.id);
  return {
    chains: chains.map(({ id, name, iconKey }) => ({ id, name, iconKey })),
    tokens,
    popularTokenIds,
  };
}
