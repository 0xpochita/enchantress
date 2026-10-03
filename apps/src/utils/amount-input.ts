const DEFAULT_DECIMALS = 18;

export function cleanAmountInput(
  raw: string,
  decimals = DEFAULT_DECIMALS,
): string {
  const digits = raw.replace(",", ".").replace(/[^0-9.]/g, "");
  const [whole, ...rest] = digits.split(".");
  if (rest.length === 0) return whole;
  return `${whole || "0"}.${rest.join("").slice(0, decimals)}`;
}
