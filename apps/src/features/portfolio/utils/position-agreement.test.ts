import assert from "node:assert/strict";
import { test } from "node:test";
import { indexLotGroups } from "../../executions/utils/withdraw.ts";
import { RAY } from "../../vaults/utils/aave-math.ts";
import {
  aggregateLots,
  type Lot,
  type MarketQuote,
  marketKey,
  valueHoldings,
} from "./lots.ts";
import { buildPositions } from "./positions.ts";

interface Case {
  name: string;
  lots: Lot[];
  quotes: [string, MarketQuote][];
}

const usdc = (rateRay: bigint): MarketQuote => ({
  rateRay,
  decimals: 6,
  priceUsd: 1,
  apy: 4,
});

const lot = (
  indexId: string,
  venueId: string,
  asset: string,
  units: string,
) => ({
  indexId,
  venueId,
  assetSymbol: asset,
  units,
});

const CASES: Case[] = [
  {
    name: "one aave lot with accrued income",
    lots: [lot("a", "aave-v3", "USDC", "10000000")],
    quotes: [[marketKey("aave-v3", "USDC"), usdc((RAY * 11n) / 10n)]],
  },
  {
    name: "several lots, a shared market and a vault",
    lots: [
      lot("a", "aave-v3", "USDC", "4000000"),
      lot("a", "aave-v3", "USDC", "2500001"),
      lot("b", "aave-v3", "USDC", "9000000"),
      lot("a", "morpho", "USDC", "777777"),
    ],
    quotes: [
      [marketKey("aave-v3", "USDC"), usdc((RAY * 1_0372n) / 1_0000n)],
      [marketKey("morpho", "USDC"), usdc((RAY * 1_05n) / 1_00n)],
    ],
  },
  {
    name: "an 18 decimal asset",
    lots: [lot("a", "neverland", "WETH", "1234567890123456789")],
    quotes: [
      [
        marketKey("neverland", "WETH"),
        {
          rateRay: (RAY * 10003n) / 10000n,
          decimals: 18,
          priceUsd: 2700,
          apy: 2,
        },
      ],
    ],
  },
  {
    name: "an unpriced market",
    lots: [lot("a", "aave-v3", "cbBTC", "5000")],
    quotes: [
      [
        marketKey("aave-v3", "cbBTC"),
        { rateRay: RAY, decimals: 8, priceUsd: undefined, apy: 0 },
      ],
    ],
  },
];

function portfolioValue(lots: Lot[], quotes: Map<string, MarketQuote>) {
  const positions = buildPositions(
    valueHoldings(aggregateLots(lots), quotes),
    new Map(),
  );
  return positions.find((p) => p.indexId === "a")?.valueUsd ?? 0;
}

function withdrawPreviewValue(lots: Lot[], quotes: Map<string, MarketQuote>) {
  const totals = aggregateLots(lots);
  const reads = indexLotGroups(totals, "a").map(({ lot }) => lot);
  return valueHoldings(reads, quotes).reduce((sum, h) => sum + h.valueUsd, 0);
}

for (const { name, lots, quotes } of CASES)
  test(`portfolio and withdraw preview agree: ${name}`, () => {
    const map = new Map(quotes);
    assert.equal(withdrawPreviewValue(lots, map), portfolioValue(lots, map));
  });
