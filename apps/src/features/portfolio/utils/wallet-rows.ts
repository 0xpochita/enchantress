import type { Chain, Token, WalletBalance } from "@/types/market";

export interface MonadBalance {
  symbol: string;
  amount: number;
}

export interface WalletRow {
  key: string;
  symbol: string;
  iconKey: string;
  amount: number;
  valueUsd: number;
}

export interface ChainGroup {
  chain: Chain;
  rows: WalletRow[];
  totalUsd: number;
}

export interface WalletSources {
  monad: MonadBalance[];
  origin: WalletBalance[];
  chains: Chain[];
  tokens: Token[];
  prices: Record<string, number>;
  iconFor: (symbol: string) => string;
}

function monadRows(sources: WalletSources): WalletRow[] {
  return sources.monad
    .filter((b) => b.amount > 0)
    .map((b) => ({
      key: `monad-${b.symbol}`,
      symbol: b.symbol,
      iconKey: sources.iconFor(b.symbol),
      amount: b.amount,
      valueUsd: b.amount * (sources.prices[b.symbol] ?? 0),
    }));
}

function originRows(sources: WalletSources): [string, WalletRow][] {
  const monadSymbols = new Set(sources.monad.map((b) => b.symbol));
  return sources.origin.flatMap((balance) => {
    const token = sources.tokens.find((t) => t.id === balance.tokenId);
    if (!token || balance.amount <= 0) return [];
    if (token.chainId === "monad" && monadSymbols.has(token.symbol)) return [];
    const row = {
      key: token.id,
      symbol: token.symbol,
      iconKey: token.iconKey,
      amount: balance.amount,
      valueUsd: balance.amount * token.priceUsd,
    };
    return [[token.chainId, row] as [string, WalletRow]];
  });
}

export function groupWalletRows(sources: WalletSources): ChainGroup[] {
  const entries: [string, WalletRow][] = [
    ...monadRows(sources).map((row) => ["monad", row] as [string, WalletRow]),
    ...originRows(sources),
  ];
  return sources.chains
    .map((chain) => {
      const rows = entries
        .filter(([chainId]) => chainId === chain.id)
        .map(([, row]) => row)
        .sort((a, b) => b.valueUsd - a.valueUsd);
      const totalUsd = rows.reduce((sum, r) => sum + r.valueUsd, 0);
      return { chain, rows, totalUsd };
    })
    .filter((group) => group.rows.length > 0)
    .sort((a, b) => b.totalUsd - a.totalUsd);
}
