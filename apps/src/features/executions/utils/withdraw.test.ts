import assert from "node:assert/strict";
import { test } from "node:test";
import { maxUint256 } from "viem";
import {
  fractionToPpm,
  planWithdrawLegs,
  reduceLots,
  type WithdrawHolding,
  withdrawSteps,
} from "./withdraw.ts";

const RAY = 10n ** 27n;

const aave: WithdrawHolding = {
  venueId: "aave-v3",
  assetSymbol: "USDC",
  venueKind: "aave-pool",
  units: 1_000_000n,
  otherUnits: 0n,
  liquidityIndex: (RAY * 105n) / 100n,
};

const morpho: WithdrawHolding = {
  venueId: "morpho",
  assetSymbol: "USDT0",
  venueKind: "erc4626",
  units: 999n,
  otherUnits: 0n,
  liquidityIndex: 0n,
};

test("fractionToPpm rounds to parts per million", () => {
  assert.equal(fractionToPpm(0.25), 250_000n);
  assert.equal(fractionToPpm(1), 1_000_000n);
  assert.equal(fractionToPpm(1 / 3), 333_333n);
});

test("aave legs convert scaled units to assets and floor", () => {
  const [leg] = planWithdrawLegs([aave], 0.5);
  assert.equal(leg.amountBase, 525_000n);
  assert.equal(leg.units, 500_000n);
  assert.equal(leg.isMax, false);
  const [third] = planWithdrawLegs([{ ...aave, units: 10n }], 1 / 3);
  assert.equal(third.amountBase, 3n);
});

test("full withdraw uses max uint only when no other index holds the market", () => {
  const [last] = planWithdrawLegs([aave], 1);
  assert.equal(last.amountBase, maxUint256);
  assert.equal(last.isMax, true);
  const [shared] = planWithdrawLegs([{ ...aave, otherUnits: 5n }], 1);
  assert.equal(shared.amountBase, 1_050_000n);
  assert.equal(shared.isMax, false);
});

test("erc4626 legs redeem a floored share of the vault shares", () => {
  const [leg] = planWithdrawLegs([morpho], 0.75);
  assert.equal(leg.amountBase, 749n);
  const [all] = planWithdrawLegs([morpho], 1);
  assert.equal(all.amountBase, 999n);
  assert.equal(all.isMax, false);
});

test("planWithdrawLegs skips empty holdings, dust and invalid fractions", () => {
  assert.equal(planWithdrawLegs([{ ...aave, units: 0n }], 0.5).length, 0);
  assert.equal(planWithdrawLegs([{ ...morpho, units: 1n }], 0.5).length, 0);
  assert.equal(planWithdrawLegs([aave], 0).length, 0);
  assert.equal(planWithdrawLegs([aave], 1.5).length, 0);
});

test("withdrawSteps maps venues to withdraw and redeem steps in order", () => {
  const steps = withdrawSteps(planWithdrawLegs([aave, morpho], 0.25));
  assert.deepEqual(
    steps.map((s) => [s.position, s.kind, s.venueId, s.amountBase]),
    [
      [0, "withdraw", "aave-v3", "262500"],
      [1, "redeem", "morpho", "249"],
    ],
  );
});

test("reduceLots takes burned units from the oldest lots first", () => {
  const lots = [
    { id: "a", units: 100n },
    { id: "b", units: 0n },
    { id: "c", units: 50n },
  ];
  assert.deepEqual(reduceLots(lots, 30n), [{ id: "a", units: 70n }]);
  assert.deepEqual(reduceLots(lots, 120n), [
    { id: "a", units: 0n },
    { id: "c", units: 30n },
  ]);
  assert.deepEqual(reduceLots(lots, 500n), [
    { id: "a", units: 0n },
    { id: "c", units: 0n },
  ]);
  assert.deepEqual(reduceLots(lots, 0n), []);
});
