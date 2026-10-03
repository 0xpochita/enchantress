import { ArrowRight } from "lucide-react";
import { buttonClassName, CryptoIcon, TokenStack } from "@/components/ui";
import type { RoutedAllocation } from "@/types/market";
import { formatPercent } from "@/utils/format";

const PERCENT = 100;

export interface ReviewItem {
  label: string;
  value: string;
  hint: string;
}

export interface HeaderIcon {
  iconKey: string;
  label: string;
  badgeIconKey?: string;
}

export function indexIcons(allocations: RoutedAllocation[]): HeaderIcon[] {
  const bySymbol = new Map(
    allocations.map((a) => [
      a.asset.symbol,
      { iconKey: a.asset.iconKey, label: a.asset.symbol },
    ]),
  );
  return [...bySymbol.values()];
}

export function ReviewHeader({
  eyebrow,
  title,
  icons = [],
}: {
  eyebrow?: string;
  title: string;
  icons?: HeaderIcon[];
}) {
  return (
    <header className="flex flex-col gap-1">
      {eyebrow && <p className="text-xs text-ink-muted">{eyebrow}</p>}
      <h2 className="flex items-center gap-3 text-xl font-light tracking-tight">
        {icons.length === 1 ? (
          <CryptoIcon {...icons[0]} size={28} />
        ) : (
          icons.length > 1 && <TokenStack items={icons} size={28} />
        )}
        {title}
      </h2>
    </header>
  );
}

export function ReviewSummary({ items }: { items: ReviewItem[] }) {
  return (
    <dl className="grid grid-cols-3 gap-3 rounded-md bg-surface-raised p-3">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-xs text-ink-muted">{item.label}</dt>
          <dd className="truncate text-sm font-medium">{item.value}</dd>
          <dd className="text-xs text-ink-subtle">{item.hint}</dd>
        </div>
      ))}
    </dl>
  );
}

function SliceRow({ slice }: { slice: RoutedAllocation }) {
  return (
    <li className="flex items-center gap-2 py-2 text-sm">
      <CryptoIcon iconKey={slice.asset.iconKey} label="" size={22} />
      {slice.asset.symbol}
      <ArrowRight aria-hidden className="size-3 text-ink-subtle" />
      <CryptoIcon iconKey={slice.venue.iconKey} label="" size={18} />
      <span className="text-ink-muted">{slice.venue.name}</span>
      <span className="ml-auto tabular-nums">
        {Math.round(slice.weight * PERCENT)}%
      </span>
      <span className="w-14 text-right text-positive tabular-nums">
        {formatPercent(slice.apy)}
      </span>
    </li>
  );
}

export function SliceList({ slices }: { slices: RoutedAllocation[] }) {
  return (
    <ul className="flex flex-col divide-y divide-line">
      {slices.map((slice) => (
        <SliceRow key={slice.asset.symbol} slice={slice} />
      ))}
    </ul>
  );
}

export function ReviewActions({
  onCancel,
  onConfirm,
  confirmLabel = "Confirm",
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={onCancel}
        className={buttonClassName("secondary", "py-3 text-sm")}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className={buttonClassName("primary", "py-3 text-sm")}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
