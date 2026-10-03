import { formatUnits } from "viem";

const MINIMUM_PATTERN = /at least (\d+)/;

export function minimumAmountMessage(
  auroraMessage: string,
  decimals: number,
  symbol: string,
): string | null {
  const match = MINIMUM_PATTERN.exec(auroraMessage);
  if (!match) return null;
  return `Minimum ${formatUnits(BigInt(match[1]), decimals)} ${symbol}`;
}
