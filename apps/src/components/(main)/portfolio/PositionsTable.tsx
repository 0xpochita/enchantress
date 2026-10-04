import Link from "next/link";
import { Card, CryptoIcon, TokenStack } from "@/components/ui";
import type { PortfolioHolding, PortfolioPosition } from "@/features/portfolio";
import { formatSignedUsd } from "@/features/portfolio/utils/signed-usd";
import { formatPercent, formatUsd } from "@/utils/format";
import { RowMenu } from "./RowMenu";

const PERCENT = 100;
const HEAD =
  "px-3 py-3 text-left text-xs font-normal text-ink-muted first:pl-6 last:pr-6";
const CELL = "px-3 py-4 first:pl-6 last:pr-6";
const PILL =
  "rounded-md bg-surface-raised px-1.5 py-0.5 text-xs text-ink-muted tabular-nums";

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  return [...new Map(items.map((item) => [key(item), item])).values()];
}

function stackItems(
  holdings: PortfolioHolding[],
  pick: (h: PortfolioHolding) => { iconKey: string; label: string },
) {
  return uniqueBy(holdings.map(pick), (item) => item.label);
}

function IndexCell({ position }: { position: PortfolioPosition }) {
  return (
    <Link
      href={`/indexes/${position.indexId}`}
      className="flex items-center gap-3 hover:underline"
    >
      <TokenStack
        items={stackItems(position.holdings, (h) => ({
          iconKey: h.assetIconKey,
          label: h.assetSymbol,
        }))}
        size={22}
      />
      <span className="whitespace-nowrap">{position.indexName}</span>
    </Link>
  );
}

function PositionRow({
  row,
  totalUsd,
}: {
  row: PortfolioPosition;
  totalUsd: number;
}) {
  const share = totalUsd > 0 ? row.valueUsd / totalUsd : 0;
  const earnedTone = row.earnedUsd >= 0 ? "text-positive" : "";
  return (
    <tr className="border-t border-line transition-colors duration-200 hover:bg-surface-raised/60">
      <td className={CELL}>
        <span className="flex items-center gap-2 whitespace-nowrap">
          <CryptoIcon iconKey="monad" label="" size={20} />
          Monad
        </span>
      </td>
      <td className={CELL}>
        <IndexCell position={row} />
      </td>
      <td className={CELL}>
        <span className="flex items-center gap-2 whitespace-nowrap tabular-nums">
          {formatUsd(row.valueUsd)}
          <span className={PILL}>{Math.round(share * PERCENT)}%</span>
        </span>
      </td>
      <td className={CELL}>
        <TokenStack
          items={stackItems(row.holdings, (h) => ({
            iconKey: h.venueIconKey,
            label: h.venueName,
          }))}
          size={20}
        />
      </td>
      <td className={`${CELL} text-positive tabular-nums`}>
        {formatPercent(row.apy)}
      </td>
      <td className={CELL}>
        <span className={`${PILL} ${earnedTone}`}>
          {formatSignedUsd(row.earnedUsd)}
        </span>
      </td>
      <td className={`${CELL} text-center`}>
        <RowMenu indexId={row.indexId} indexName={row.indexName} />
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
  totalUsd,
}: {
  rows: PortfolioPosition[];
  totalUsd: number;
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
            <th
              scope="col"
              className={HEAD.replace("text-left", "text-center")}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <PositionRow key={row.indexId} row={row} totalUsd={totalUsd} />
          ))}
        </tbody>
      </table>
    </Card>
  );
}
