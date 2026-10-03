import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ExternalLink,
  Loader2,
  type LucideIcon,
  X,
} from "lucide-react";
import { Card, CryptoIcon } from "@/components/ui";
import { originChainById } from "@/config/chains";
import type { IndexIcon, PortfolioPurchase } from "@/features/portfolio";
import { formatAmount, formatShortDate, formatUsd } from "@/utils/format";
import { IndexLink, RouteCell } from "./IndexLink";

const HEAD =
  "px-3 py-3 text-left text-[0.7rem] font-medium tracking-wider text-ink-subtle uppercase first:pl-6 last:pr-6";
const CELL = "px-3 py-4 first:pl-6 last:pr-6";
const COLUMNS = ["Index", "Paid with", "Route", "Value", "Status"];

const STATUS_STYLE: Record<string, { icon: LucideIcon; tone: string }> = {
  succeeded: { icon: Check, tone: "text-positive" },
  failed: { icon: X, tone: "text-negative" },
  refunded: { icon: X, tone: "text-negative" },
  cancelled: { icon: X, tone: "text-ink-subtle" },
};
const RUNNING = { icon: Loader2, tone: "text-brand" };

function StatusCell({ status }: { status: string }) {
  const { icon: Icon, tone } = STATUS_STYLE[status] ?? RUNNING;
  return (
    <span className="flex items-center gap-2 capitalize">
      <Icon
        aria-hidden
        className={`size-4 ${tone} ${Icon === Loader2 ? "animate-spin" : ""}`}
      />
      {status}
    </span>
  );
}

function explorerUrl(chainId: string, txHash: string): string {
  const base = originChainById(chainId)?.chain.blockExplorers?.default.url;
  return `${base ?? "https://monadscan.com"}/tx/${txHash}`;
}

function PaidCell({ row }: { row: PortfolioPurchase }) {
  const chain = originChainById(row.chainId);
  const label =
    row.paidAmount === null
      ? row.paidSymbol.replaceAll(",", ", ")
      : `${formatAmount(row.paidAmount)} ${row.paidSymbol}`;
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <CryptoIcon
        iconKey={row.paidIconKey}
        label={row.paidSymbol}
        badgeIconKey={chain?.iconKey}
      />
      {label}
    </span>
  );
}

function PurchaseRow({
  row,
  icons,
}: {
  row: PortfolioPurchase;
  icons: IndexIcon[];
}) {
  const Icon = row.kind === "deposit" ? ArrowDownLeft : ArrowUpRight;
  return (
    <tr className="border-t border-line">
      <td className={CELL}>
        <span className="flex items-center gap-2 whitespace-nowrap">
          <Icon aria-hidden className="size-4 text-ink-subtle" />
          {row.kind === "deposit" ? "Bought" : "Sold"}
          <IndexLink
            indexId={row.indexId}
            indexName={row.indexName}
            icons={icons}
          />
        </span>
      </td>
      <td className={CELL}>
        <PaidCell row={row} />
      </td>
      <td className={CELL}>
        <RouteCell viaAurora={row.chainId !== "monad"} />
      </td>
      <td className={`${CELL} tabular-nums`}>{formatUsd(row.valueUsd)}</td>
      <td className={CELL}>
        <StatusCell status={row.status} />
      </td>
      <td className={`${CELL} text-right`}>
        {row.txHash && (
          <a
            href={explorerUrl(row.chainId, row.txHash)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-xs text-brand hover:underline"
          >
            {row.txHash.slice(0, 8)}…{" "}
            <ExternalLink aria-hidden className="size-3" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
        <span className="block text-xs text-ink-subtle">
          {formatShortDate(row.at)}
        </span>
      </td>
    </tr>
  );
}

export function PurchaseHistory({
  rows,
  indexIcons,
}: {
  rows: PortfolioPurchase[];
  indexIcons: Record<string, IndexIcon[]>;
}) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="px-6 pt-6 pb-2 text-left text-sm text-ink-muted">
          Index purchases
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
            <PurchaseRow
              key={row.id}
              row={row}
              icons={indexIcons[row.indexId] ?? []}
            />
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="px-6 pb-6 text-sm text-ink-muted">
          No purchases yet. Every index you buy or sell shows up here.
        </p>
      )}
    </Card>
  );
}
