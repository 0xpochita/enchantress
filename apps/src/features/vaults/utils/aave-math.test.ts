import assert from "node:assert/strict";
import { test } from "node:test";
import { baseUnitsToUsd, rayRateToApy, scaledToAssets } from "./aave-math.ts";

const RAY = 10n ** 27n;

test("rayRateToApy compounds a per second ray rate into a yearly percent", () => {
  assert.equal(rayRateToApy(0n), 0);
  const fivePercentApr = (RAY * 5n) / 100n;
  const apy = rayRateToApy(fivePercentApr);
  assert.ok(apy > 5.12 && apy < 5.13, `expected about 5.127, got ${apy}`);
});

test("scaledToAssets applies the liquidity index with rounding", () => {
  const index = (RAY * 101n) / 100n;
  assert.equal(scaledToAssets(1_000_000n, index), 1_010_000n);
  assert.equal(scaledToAssets(0n, index), 0n);
  assert.equal(scaledToAssets(3n, RAY + RAY / 2n), 5n);
});

test("baseUnitsToUsd prices base units with an 8 decimal oracle", () => {
  assert.equal(baseUnitsToUsd(1_500_000n, 6, 100_000_000n), 1.5);
  assert.equal(baseUnitsToUsd(10n ** 18n, 18, 270_000_000_000n), 2700);
  assert.equal(baseUnitsToUsd(123n, 6, 100_000_000n), 0);
});
