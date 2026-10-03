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
};

const POPULAR_SYMBOLS = new Set(["USDC", "ETH", "USDT"]);
const POPULAR_LIMIT = 6;

export function tokenIconKey(symbol: string): string {
  return ICON_BY_SYMBOL[symbol.toUpperCase()] ?? "generic";
}

export function buildBridgeCatalog(
  chains: CatalogChain[],
  source: CatalogSourceToken[],
): BridgeCatalog {
  const byCode = new Map(chains.map((chain) => [chain.auroraCode, chain]));
  const tokens = source.flatMap((token) => {
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
      },
    ];
  });
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
