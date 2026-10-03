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

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

const SHORT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
};

const DAY_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
};

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

export function formatDate(isoDate: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-GB", { ...DATE_OPTIONS, timeZone }).format(
    new Date(isoDate),
  );
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, ADDRESS_EDGE_LENGTH)}...${address.slice(-ADDRESS_EDGE_LENGTH + 2)}`;
}

export function formatShortDate(isoDate: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", { ...SHORT_DATE_OPTIONS, timeZone })
    .format(new Date(isoDate))
    .replace(",", "");
}

export function formatDay(time: number | string, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", { ...DAY_OPTIONS, timeZone }).format(
    new Date(time),
  );
}
