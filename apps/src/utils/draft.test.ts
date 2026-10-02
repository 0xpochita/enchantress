import assert from "node:assert/strict";
import { test } from "node:test";
import { type DraftCatalog, type DraftState, deriveDraft } from "./draft.ts";

const CATALOG: DraftCatalog = {
  aggregators: [{ id: "agg", name: "Agg", description: "", venueIds: ["v"] }],
  venuesByAggregator: {
    agg: [
      {
        id: "v",
        name: "V",
        iconKey: "generic",
        chainId: "monad",
        markets: [{ assetSymbol: "USDC", apy: 5 }],
      },
    ],
  },
  vaultAssets: [
    { symbol: "USDC", name: "USD Coin", iconKey: "usdc", priceUsd: 1 },
    {
      symbol: "WBTC",
      name: "Wrapped Bitcoin",
      iconKey: "wbtc",
      priceUsd: 100000,
    },
  ],
  tokens: [
    {
      id: "eth-base",
      symbol: "ETH",
      name: "Ether",
      chainId: "base",
      iconKey: "eth",
      priceUsd: 2000,
    },
  ],
  defaultDepositTokenId: "eth-base",
};

const STATE: DraftState = {
  name: "core",
  aggregatorId: "agg",
  assetSymbols: ["USDC"],
  weightMode: "equal",
  customPercents: {},
  amount: "0.5",
  depositTokenId: "eth-base",
};

test("deriveDraft only offers assets the aggregator can route", () => {
  const draft = deriveDraft(CATALOG, STATE);
  assert.deepEqual(
    draft.availableAssets.map((a) => a.symbol),
    ["USDC"],
  );
});

test("deriveDraft prices a cross-chain deposit and routes it", () => {
  const draft = deriveDraft(CATALOG, STATE);
  assert.equal(draft.depositUsd, 1000);
  assert.equal(draft.allocations[0]?.valueUsd, 1000);
  assert.equal(draft.rewardsUsd, 50);
  assert.deepEqual(draft.errors, []);
});

test("deriveDraft rejects custom weights that do not add up", () => {
  const draft = deriveDraft(CATALOG, {
    ...STATE,
    weightMode: "custom",
    customPercents: { USDC: 40 },
  });
  assert.deepEqual(draft.errors, ["Custom weights must add up to 100%."]);
});
