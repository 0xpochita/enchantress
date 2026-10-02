import type { Token, WalletBalance } from "@/types/market";

interface TokenSeed {
  symbol: string;
  name: string;
  iconKey: string;
  priceUsd: number;
  chainIds: string[];
}

const TOKEN_SEEDS: TokenSeed[] = [
  {
    symbol: "ETH",
    name: "Ether",
    iconKey: "eth",
    priceUsd: 3150.42,
    chainIds: ["eth", "base", "arb", "op", "scroll"],
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    iconKey: "usdc",
    priceUsd: 1,
    chainIds: ["monad", "eth", "base", "arb", "sol", "pol", "op", "avax"],
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    iconKey: "usdt",
    priceUsd: 1,
    chainIds: ["monad", "eth", "arb", "tron", "bsc", "plasma"],
  },
  {
    symbol: "MON",
    name: "Monad",
    iconKey: "monad",
    priceUsd: 0.41,
    chainIds: ["monad"],
  },
  {
    symbol: "BTC",
    name: "Bitcoin",
    iconKey: "btc",
    priceUsd: 104250,
    chainIds: ["btc"],
  },
  {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    iconKey: "wbtc",
    priceUsd: 104180,
    chainIds: ["monad", "eth", "arb"],
  },
  {
    symbol: "SOL",
    name: "Solana",
    iconKey: "sol",
    priceUsd: 172.3,
    chainIds: ["sol"],
  },
  {
    symbol: "BNB",
    name: "BNB",
    iconKey: "bnb",
    priceUsd: 612.5,
    chainIds: ["bsc"],
  },
  {
    symbol: "DAI",
    name: "Dai Stablecoin",
    iconKey: "dai",
    priceUsd: 1,
    chainIds: ["eth", "gnosis"],
  },
  {
    symbol: "AVAX",
    name: "Avalanche",
    iconKey: "avax",
    priceUsd: 28.4,
    chainIds: ["avax"],
  },
  {
    symbol: "TRX",
    name: "Tron",
    iconKey: "trx",
    priceUsd: 0.27,
    chainIds: ["tron"],
  },
  {
    symbol: "XRP",
    name: "XRP",
    iconKey: "xrp",
    priceUsd: 2.31,
    chainIds: ["xrp"],
  },
  {
    symbol: "DOGE",
    name: "Dogecoin",
    iconKey: "doge",
    priceUsd: 0.19,
    chainIds: ["doge"],
  },
  {
    symbol: "LINK",
    name: "Chainlink",
    iconKey: "link",
    priceUsd: 17.8,
    chainIds: ["eth", "arb"],
  },
  {
    symbol: "UNI",
    name: "Uniswap",
    iconKey: "uni",
    priceUsd: 9.6,
    chainIds: ["eth", "base"],
  },
  {
    symbol: "AAVE",
    name: "Aave",
    iconKey: "aave",
    priceUsd: 268.2,
    chainIds: ["eth", "pol"],
  },
];

export const TOKENS: Token[] = TOKEN_SEEDS.flatMap((seed) =>
  seed.chainIds.map((chainId) => ({
    id: `${seed.symbol.toLowerCase()}-${chainId}`,
    symbol: seed.symbol,
    name: seed.name,
    chainId,
    iconKey: seed.iconKey,
    priceUsd: seed.priceUsd,
  })),
);

export const POPULAR_TOKEN_IDS = [
  "eth-base",
  "usdc-monad",
  "eth-arb",
  "mon-monad",
  "sol-sol",
];

export const DEFAULT_DEPOSIT_TOKEN_ID = "usdc-monad";

export const WALLET_BALANCES: WalletBalance[] = [
  { tokenId: "eth-base", amount: 0.84 },
  { tokenId: "usdc-base", amount: 1250.5 },
  { tokenId: "mon-monad", amount: 312.33 },
  { tokenId: "usdc-monad", amount: 420 },
  { tokenId: "eth-arb", amount: 0.12 },
  { tokenId: "sol-sol", amount: 6.4 },
  { tokenId: "bnb-bsc", amount: 0.0011 },
];

export const WALLET_ADDRESS = "0x0E5cC5a1b9d27F4c3E8A61dB04f2C08f";
