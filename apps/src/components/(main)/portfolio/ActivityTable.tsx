import { ArrowDownLeft, ArrowUpRight, ExternalLink } from "lucide-react";
import { Card, CryptoIcon } from "@/components/ui";
import { TX_EXPLORER_URL } from "@/config/explorer";
import type { IndexIcon, PortfolioActivity } from "@/features/portfolio";
import { formatAmount, formatShortDate, formatUsd } from "@/utils/format";
import { IndexLink, RouteCell } from "./IndexLink";

const HEAD =
  "px-3 py-3 text-left text-[0.7rem] font-medium tracking-wider text-ink-subtle uppercase first:pl-6 last:pr-6";
const CELL = "px-3 py-4 first:pl-6 last:pr-6";
const COLUMNS = ["Type", "Asset", "Index", "Route", "Value"];

function TypeCell({
  direction,
}: {
  direction: PortfolioActivity["direction"];
}) {
  const Icon = direction === "in" ? ArrowDownLeft : ArrowUpRight;
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <Icon aria-hidden className="size-4 text-ink-subtle" />
      {direction === "in" ? "Buy" : "Sell"}
    </span>
  );
}

function ActivityRow({
  row,
  icons,
}: {
  row: PortfolioActivity;
  icons: IndexIcon[];
}) {
  return (
    <tr className="border-t border-line transition-colors duration-200 hover:bg-surface-raised">
      <td className={CELL}>
        <TypeCell direction={row.direction} />
      </td>
      <td className={CELL}>
        <span className="flex items-center gap-2 whitespace-nowrap">
          <CryptoIcon iconKey={row.assetIconKey} label={row.assetSymbol} />
          {formatAmount(row.amount)}
          <span className="text-ink-muted">{row.assetSymbol}</span>
        </span>
      </td>
      <td className={CELL}>
        <IndexLink
          indexId={row.indexId}
          indexName={row.indexName}
          icons={icons}
        />
      </td>
      <td className={CELL}>
        <RouteCell viaAurora={row.viaAurora} />
      </td>
      <td className={`${CELL} tabular-nums`}>{formatUsd(row.valueUsd)}</td>
      <td className={`${CELL} text-right`}>
        <a
          href={`${TX_EXPLORER_URL}${row.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono text-xs text-brand hover:underline"
        >
          {row.txHash.slice(0, 8)}…{" "}
          <ExternalLink aria-hidden className="size-3" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <span className="block text-xs text-ink-subtle">
          {formatShortDate(row.at)}
        </span>
      </td>
    </tr>
  );
}

export function ActivityTable({
  rows,
  indexIcons,
}: {
  rows: PortfolioActivity[];
  indexIcons: Record<string, IndexIcon[]>;
}) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="px-6 pt-6 pb-2 text-left text-sm text-ink-muted">
          Assets bought and sold
        </caption>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column} scope="col" className={HEAD}>
                {column}
              </th>
            ))}
            <th scope="col" className={`${HEAD} text-right`}>
              Transaction
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <ActivityRow
              key={row.id}
              row={row}
              icons={indexIcons[row.indexId] ?? []}
            />
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="px-6 pb-6 text-sm text-ink-muted">
          No activity yet. Every asset your indexes buy or sell shows up here.
        </p>
      )}
    </Card>
  );
}
