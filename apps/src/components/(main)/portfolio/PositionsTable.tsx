import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card, CryptoIcon, TokenStack } from "@/components/ui";
import type { PortfolioPosition } from "@/lib/market";
import { formatPercent, formatUsd } from "@/utils/format";

export interface PositionRowData extends PortfolioPosition {
  earnedUsd: number;
}

const PERCENT = 100;
const HEAD =
  "px-3 py-3 text-left text-xs font-normal text-ink-muted first:pl-6 last:pr-6";
const CELL = "px-3 py-4 first:pl-6 last:pr-6";
const PILL =
  "rounded-md bg-surface-raised px-1.5 py-0.5 text-xs text-ink-muted tabular-nums";

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  return [...new Map(items.map((item) => [key(item), item])).values()];
}

function IndexCell({ position }: { position: PortfolioPosition }) {
  const assets = uniqueBy(
    position.allocations.map((a) => a.asset),
    (a) => a.symbol,
  );
  return (
    <Link
      href={`/indexes/${position.index.id}`}
      className="flex items-center gap-3 hover:underline"
    >
      <TokenStack
        items={assets.map((a) => ({ iconKey: a.iconKey, label: a.symbol }))}
        size={22}
      />
      <span className="whitespace-nowrap">{position.index.name}</span>
    </Link>
  );
}

function PositionRow({
  row,
  investedUsd,
}: {
  row: PositionRowData;
  investedUsd: number;
}) {
  const venues = uniqueBy(
    row.allocations.map((a) => a.venue),
    (v) => v.id,
  );
  const share = investedUsd > 0 ? row.index.positionUsd / investedUsd : 0;
  return (
    <tr className="border-t border-line transition-colors duration-200 hover:bg-surface-raised/60">
      <td className={CELL}>
        <CryptoIcon iconKey="monad" label="Monad" size={20} />
      </td>
      <td className={CELL}>
        <IndexCell position={row} />
      </td>
      <td className={CELL}>
        <span className="flex items-center gap-2 whitespace-nowrap tabular-nums">
          {formatUsd(row.index.positionUsd)}
          <span className={PILL}>{Math.round(share * PERCENT)}%</span>
        </span>
      </td>
      <td className={CELL}>
        <TokenStack
          items={venues.map((v) => ({ iconKey: v.iconKey, label: v.name }))}
          size={20}
        />
      </td>
      <td className={`${CELL} text-positive tabular-nums`}>
        {formatPercent(row.apy)}
      </td>
      <td className={CELL}>
        <span className={`${PILL} text-positive`}>
          +{formatUsd(row.earnedUsd)}
        </span>
      </td>
      <td className={`${CELL} w-8`}>
        <Link
          href={`/indexes/${row.index.id}`}
          aria-label={`Open ${row.index.name}`}
          className="flex text-ink-subtle hover:text-ink"
        >
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      </td>
    </tr>
  );
}

const COLUMNS = [
  "Network",
  "Index",
  "Deposits",
  "Exposure",
  "APY",
  "Earned interest",
];

export function PositionsTable({
  rows,
  investedUsd,
}: {
  rows: PositionRowData[];
  investedUsd: number;
}) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column} scope="col" className={HEAD}>
                {column}
              </th>
            ))}
            <th scope="col" className={HEAD}>
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <PositionRow
              key={row.index.id}
              row={row}
              investedUsd={investedUsd}
            />
          ))}
        </tbody>
      </table>
    </Card>
  );
}
