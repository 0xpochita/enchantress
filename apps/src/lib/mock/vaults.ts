import type { Aggregator, VaultAsset, Venue } from "@/types/market";

export const VAULT_CHAIN_ID = "monad";

export const VAULT_ASSETS: VaultAsset[] = [
  { symbol: "USDC", name: "USD Coin", iconKey: "usdc", priceUsd: 1 },
  { symbol: "USDT0", name: "USDT0", iconKey: "usdt", priceUsd: 1 },
  { symbol: "MON", name: "Monad", iconKey: "monad", priceUsd: 0.41 },
  { symbol: "WETH", name: "Wrapped Ether", iconKey: "eth", priceUsd: 3150.42 },
  {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    iconKey: "wbtc",
    priceUsd: 104180,
  },
  { symbol: "DAI", name: "Dai Stablecoin", iconKey: "dai", priceUsd: 1 },
];

export const VENUES: Venue[] = [
  {
    id: "neverland",
    name: "Neverland",
    iconKey: "/logo/neverland-logo.jpg",
    chainId: VAULT_CHAIN_ID,
    markets: [
      { assetSymbol: "USDC", apy: 6.12 },
      { assetSymbol: "MON", apy: 8.4 },
      { assetSymbol: "WETH", apy: 3.05 },
      { assetSymbol: "USDT0", apy: 5.48 },
    ],
  },
  {
    id: "aave-v3",
    name: "Aave v3",
    iconKey: "aave",
    chainId: VAULT_CHAIN_ID,
    markets: [
      { assetSymbol: "USDC", apy: 5.63 },
      { assetSymbol: "USDT0", apy: 5.91 },
      { assetSymbol: "WETH", apy: 2.16 },
      { assetSymbol: "WBTC", apy: 0.84 },
      { assetSymbol: "DAI", apy: 4.72 },
    ],
  },
  {
    id: "compound-v3",
    name: "Compound v3",
    iconKey: "comp",
    chainId: VAULT_CHAIN_ID,
    markets: [
      { assetSymbol: "USDC", apy: 4.91 },
      { assetSymbol: "WETH", apy: 2.83 },
      { assetSymbol: "WBTC", apy: 1.12 },
    ],
  },
  {
    id: "curve",
    name: "Curve",
    iconKey: "crv",
    chainId: VAULT_CHAIN_ID,
    markets: [
      { assetSymbol: "USDT0", apy: 6.4 },
      { assetSymbol: "DAI", apy: 5.2 },
      { assetSymbol: "MON", apy: 7.15 },
    ],
  },
  {
    id: "spark",
    name: "Spark",
    iconKey: "mkr",
    chainId: VAULT_CHAIN_ID,
    markets: [
      { assetSymbol: "DAI", apy: 5.75 },
      { assetSymbol: "USDC", apy: 5.1 },
    ],
  },
];

export const AGGREGATORS: Aggregator[] = [
  {
    id: "neverland-aave",
    name: "Neverland + Aave",
    description:
      "Lending markets on Monad. Each asset goes to whichever of the two pays more.",
    venueIds: ["neverland", "aave-v3"],
  },
  {
    id: "stable-max",
    name: "Stable Max",
    description:
      "Stablecoin focused venues for steady yield with low price exposure.",
    venueIds: ["curve", "spark", "aave-v3"],
  },
  {
    id: "blue-chip",
    name: "Blue Chip",
    description:
      "Battle tested lending venues for ETH, BTC and dollar assets on Monad.",
    venueIds: ["aave-v3", "compound-v3"],
  },
];
