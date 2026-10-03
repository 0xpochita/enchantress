import { formatUsd } from "../../../utils/format.ts";

const HALF_CENT = 0.005;

export function formatSignedUsd(value: number): string {
  const rounded = Math.abs(value) < HALF_CENT ? 0 : value;
  return `${rounded >= 0 ? "+" : ""}${formatUsd(rounded)}`;
}
