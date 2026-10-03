import assert from "node:assert/strict";
import { test } from "node:test";
import { groupWalletRows, type WalletSources } from "./wallet-rows.ts";

const chains = [
  { id: "monad", name: "Monad", iconKey: "monad" },
  { id: "base", name: "Base", iconKey: "base" },
  { id: "arb", name: "Arbitrum", iconKey: "arb" },
] as WalletSources["chains"];

const tokens = [
  {
    id: "mon",
    symbol: "MON",
    name: "MON",
    chainId: "monad",
    iconKey: "monad",
    priceUsd: 2,
  },
  {
    id: "musdc",
    symbol: "USDC",
    name: "USDC",
    chainId: "monad",
    iconKey: "usdc",
    priceUsd: 1,
  },
  {
    id: "busdc",
    symbol: "USDC",
    name: "USDC",
    chainId: "base",
    iconKey: "usdc",
    priceUsd: 1,
  },
  {
    id: "beth",
    symbol: "ETH",
    name: "ETH",
    chainId: "base",
    iconKey: "eth",
    priceUsd: 3000,
  },
] as WalletSources["tokens"];

function sources(overrides: Partial<WalletSources> = {}): WalletSources {
  return {
    monad: [
      { symbol: "USDC", amount: 5 },
      { symbol: "WETH", amount: 0 },
    ],
    origin: [
      { tokenId: "mon", amount: 1.5 },
      { tokenId: "musdc", amount: 5 },
      { tokenId: "busdc", amount: 10 },
      { tokenId: "beth", amount: 0.001 },
    ],
    chains,
    tokens,
    prices: { USDC: 1 },
    monadMeta: (symbol) => ({
      iconKey: symbol.toLowerCase(),
      address: "0xusdc",
      decimals: 6,
    }),
    ...overrides,
  };
}

test("monad tokens are not counted twice and native MON is kept", () => {
  const [base, monad] = groupWalletRows(sources());
  assert.equal(monad.chain.id, "monad");
  assert.deepEqual(
    monad.rows.map((r) => [r.symbol, r.amount]),
    [
      ["USDC", 5],
      ["MON", 1.5],
    ],
  );
  assert.equal(monad.totalUsd, 8);
  assert.equal(base.totalUsd, 13);
});

test("chains are sorted by value and empty chains are dropped", () => {
  const groups = groupWalletRows(sources());
  assert.deepEqual(
    groups.map((g) => g.chain.id),
    ["base", "monad"],
  );
});

test("rows carry what a transfer needs", () => {
  const [base, monad] = groupWalletRows(sources());
  const usdc = monad.rows.find((r) => r.symbol === "USDC");
  assert.deepEqual([usdc?.address, usdc?.decimals], ["0xusdc", 6]);
  const eth = base.rows.find((r) => r.symbol === "ETH");
  assert.equal(eth?.decimals, 18);
});

test("an empty wallet yields no groups", () => {
  const groups = groupWalletRows(sources({ monad: [], origin: [] }));
  assert.equal(groups.length, 0);
});
