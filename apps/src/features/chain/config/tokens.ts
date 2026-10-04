import type { Address } from "viem";

export interface ChainToken {
  symbol: string;
  name: string;
  iconKey: string;
  address: Address;
  decimals: number;
  isClosedToNewIndexes?: boolean;
}

export const MONAD_TOKENS = {
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    iconKey: "usdc",
    address: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
    decimals: 6,
  },
  USDT0: {
    symbol: "USDT0",
    name: "USDT0",
    iconKey: "usdt",
    address: "0xe7cd86e13AC4309349F30B3435a9d337750fC82D",
    decimals: 6,
  },
  AUSD: {
    symbol: "AUSD",
    name: "Agora Dollar",
    iconKey: "/crypto/ausd.png",
    address: "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a",
    decimals: 6,
    isClosedToNewIndexes: true,
  },
  WETH: {
    symbol: "WETH",
    name: "Wrapped Ether",
    iconKey: "eth",
    address: "0xEE8c0E9f1BFFb4Eb878d8f15f368A02a35481242",
    decimals: 18,
  },
  WMON: {
    symbol: "WMON",
    name: "Wrapped Monad",
    iconKey: "monad",
    address: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A",
    decimals: 18,
  },
  cbBTC: {
    symbol: "cbBTC",
    name: "Coinbase Wrapped BTC",
    iconKey: "/crypto/cbbtc.png",
    address: "0xd18B7EC58Cdf4876f6AFebd3Ed1730e4Ce10414b",
    decimals: 8,
    isClosedToNewIndexes: true,
  },
  WBTC: {
    symbol: "WBTC",
    name: "Wrapped BTC",
    iconKey: "wbtc",
    address: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c",
    decimals: 8,
  },
} as const satisfies Record<string, ChainToken>;

export type MonadTokenSymbol = keyof typeof MONAD_TOKENS;

export const MONAD_TOKEN_LIST: ChainToken[] = Object.values(MONAD_TOKENS);

export function monadToken(symbol: string): ChainToken | undefined {
  return MONAD_TOKEN_LIST.find((token) => token.symbol === symbol);
}

export function isOfferedForNewIndex(symbol: string): boolean {
  const token = monadToken(symbol);
  return token !== undefined && !token.isClosedToNewIndexes;
}
