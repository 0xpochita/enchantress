import { formatUsd } from "../../../utils/format.ts";

export function formatSignedUsd(value: number): string {
  return `${value >= 0 ? "+" : ""}${formatUsd(value)}`;
}
