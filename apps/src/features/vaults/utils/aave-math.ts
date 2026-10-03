const RAY = 10n ** 27n;
const SECONDS_PER_YEAR = 31_536_000;
const PERCENT = 100;
const ORACLE_DECIMALS = 8;

export function rayRateToApy(ratePerSecondRay: bigint): number {
  const perSecond = Number(ratePerSecondRay) / Number(RAY) / SECONDS_PER_YEAR;
  return ((1 + perSecond) ** SECONDS_PER_YEAR - 1) * PERCENT;
}

export function scaledToAssets(scaled: bigint, liquidityIndexRay: bigint) {
  return (scaled * liquidityIndexRay + RAY / 2n) / RAY;
}

export function baseUnitsToUsd(
  amount: bigint,
  decimals: number,
  priceE8: bigint,
): number {
  const scale = 10n ** BigInt(decimals + ORACLE_DECIMALS);
  const cents = (amount * priceE8 * 100n) / scale;
  return Number(cents) / PERCENT;
}
