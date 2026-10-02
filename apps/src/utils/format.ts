const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const COMPACT_USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const SMALLEST_DISPLAYED_AMOUNT = 0.0001;
const ADDRESS_EDGE_LENGTH = 6;

export function formatUsd(value: number): string {
  return USD_FORMATTER.format(value);
}

export function formatCompactUsd(value: number): string {
  return COMPACT_USD_FORMATTER.format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatAmount(value: number): string {
  if (value > 0 && value < SMALLEST_DISPLAYED_AMOUNT) return "<0.0001";
  return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export function formatDate(isoDate: string): string {
  return DATE_FORMATTER.format(new Date(isoDate));
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, ADDRESS_EDGE_LENGTH)}...${address.slice(-ADDRESS_EDGE_LENGTH + 2)}`;
}
