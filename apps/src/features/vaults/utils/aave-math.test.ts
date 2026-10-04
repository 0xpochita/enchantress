import assert from "node:assert/strict";
import { test } from "node:test";
import {
  baseUnitsToUsd,
  oraclePriceUsd,
  RAY,
  rayRateToApy,
} from "./aave-math.ts";

test("rayRateToApy compounds a per second ray rate into a yearly percent", () => {
  assert.equal(rayRateToApy(0n), 0);
  const fivePercentApr = (RAY * 5n) / 100n;
  const apy = rayRateToApy(fivePercentApr);
  assert.ok(apy > 5.12 && apy < 5.13, `expected about 5.127, got ${apy}`);
});

test("baseUnitsToUsd prices base units with an 8 decimal oracle", () => {
  assert.equal(baseUnitsToUsd(1_500_000n, 6, 100_000_000n), 1.5);
  assert.equal(baseUnitsToUsd(10n ** 18n, 18, 270_000_000_000n), 2700);
  assert.equal(baseUnitsToUsd(123n, 6, 100_000_000n), 0);
});

test("oraclePriceUsd keeps sub cent precision for cheap tokens", () => {
  assert.equal(oraclePriceUsd(3_524_592n), 0.03524592);
  assert.equal(oraclePriceUsd(100_000_000n), 1);
});
