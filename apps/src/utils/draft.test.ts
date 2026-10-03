import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type DraftCatalog,
  type DraftState,
  deriveDraft,
  toWeightBps,
} from "./draft.ts";

const CATALOG: DraftCatalog = {
  venues: [
    {
      id: "v",
      name: "V",
      iconKey: "generic",
      chainId: "monad",
      markets: [
        { assetSymbol: "USDC", apy: 5, tvlUsd: 1_000_000, liquidityUsd: 1 },
      ],
    },
  ],
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
  assetSymbols: ["USDC"],
  weightMode: "equal",
  customPercents: {},
  amount: "0.5",
  depositTokenId: "eth-base",
};

test("deriveDraft only offers assets some protocol can route", () => {
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

test("deriveDraft allows creating without a deposit", () => {
  const draft = deriveDraft(CATALOG, { ...STATE, amount: "" });
  assert.deepEqual(draft.errors, []);
  assert.deepEqual(draft.recipe, {
    name: "core",
    allocations: [{ assetSymbol: "USDC", weightBps: 10_000 }],
  });
});

test("deriveDraft rejects names outside 3 to 40 characters", () => {
  const draft = deriveDraft(CATALOG, { ...STATE, name: "ab" });
  assert.deepEqual(draft.errors, ["Use 3 to 40 characters for the name."]);
});

test("toWeightBps gives rounding drift to the last slice", () => {
  assert.deepEqual(toWeightBps([1 / 3, 1 / 3, 1 / 3]), [3333, 3333, 3334]);
  assert.deepEqual(toWeightBps([0.6, 0.4]), [6000, 4000]);
  assert.deepEqual(toWeightBps([]), []);
});
