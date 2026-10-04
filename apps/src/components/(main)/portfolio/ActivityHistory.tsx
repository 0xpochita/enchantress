"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  type LucideIcon,
  Plus,
  X,
} from "lucide-react";
import { useState } from "react";
import { Card, CryptoIcon, LocalDate } from "@/components/ui";
import { originChainById } from "@/config/chains";
import type {
  IndexIcon,
  PortfolioActivity,
  PortfolioPurchase,
} from "@/features/portfolio";
import { formatAmount, formatUsd } from "@/utils/format";
import { RouteCell } from "../flow/RouteCell";
import { TxLink } from "../flow/TxLink";
import { ExecutionStatusModal } from "./ExecutionStatusModal";
import { IndexLink } from "./IndexLink";

const HEAD =
  "px-3 py-3 text-left text-[0.7rem] font-medium tracking-wider text-ink-subtle uppercase first:pl-6 last:pr-6";
const CELL = "px-3 py-4 first:pl-6 last:pr-6";
const COLUMNS = ["Type", "Index", "Paid with", "Route", "Value", "Status"];
const PAGE_SIZE = 10;
const MONAD_TX_URL = "https://monadscan.com/tx/";

const STATUS_STYLE: Record<string, { icon: LucideIcon; tone: string }> = {
  succeeded: { icon: Check, tone: "text-positive" },
  failed: { icon: X, tone: "text-negative" },
  refunded: { icon: X, tone: "text-negative" },
  cancelled: { icon: X, tone: "text-ink-subtle" },
};
const KIND_LABEL: Record<
  PortfolioPurchase["kind"],
  { icon: LucideIcon; label: string }
> = {
  create: { icon: Plus, label: "Created" },
  deposit: { icon: ArrowDownLeft, label: "Bought" },
  withdraw: { icon: ArrowUpRight, label: "Sold" },
};

const RUNNING = { icon: Loader2, tone: "text-brand" };

function StatusCell({
  status,
  onOpen,
}: {
  status: string;
  onOpen: () => void;
}) {
  const { icon: Icon, tone } = STATUS_STYLE[status] ?? RUNNING;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${status}, view details`}
      className="group flex items-center gap-2 rounded-full border border-line py-1 pr-2 pl-2.5 capitalize transition-colors duration-200 hover:border-ink-subtle hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-accent"
    >
      <Icon
        aria-hidden
        className={`size-4 ${tone} ${Icon === Loader2 ? "animate-spin" : ""}`}
      />
      {status}
      <ChevronRight
        aria-hidden
        className="size-3.5 text-ink-subtle transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </button>
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

function LegRow({ leg }: { leg: PortfolioActivity }) {
  return (
    <tr className="bg-surface-raised/40">
      <td className={CELL} />
      <td className={CELL} colSpan={3}>
        <span className="flex items-center gap-2 whitespace-nowrap text-ink-muted">
          <CryptoIcon iconKey={leg.assetIconKey} label={leg.assetSymbol} />
          <span className="text-ink">{formatAmount(leg.amount)}</span>
          {leg.assetSymbol}
          <span>{leg.direction === "in" ? "into" : "from"}</span>
          {leg.venueName}
        </span>
      </td>
      <td className={`${CELL} tabular-nums text-ink-muted`}>
        {formatUsd(leg.valueUsd)}
      </td>
      <td className={CELL} />
      <td className={`${CELL} text-right`}>
        <TxLink href={`${MONAD_TX_URL}${leg.txHash}`} />
      </td>
    </tr>
  );
}

function TypeCell({
  row,
  legCount,
  isExpanded,
  onToggle,
}: {
  row: PortfolioPurchase;
  legCount: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { icon: Icon, label } = KIND_LABEL[row.kind];
  const Chevron = isExpanded ? ChevronDown : ChevronRight;
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <button
        type="button"
        onClick={onToggle}
        disabled={legCount === 0}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? "Hide" : "Show"} ${legCount} assets`}
        className="flex size-6 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-surface-raised hover:text-ink disabled:invisible"
      >
        <Chevron aria-hidden className="size-4" />
      </button>
      <Icon aria-hidden className="size-4 text-ink-subtle" />
      {label}
    </span>
  );
}

function PurchaseRow({
  row,
  icons,
  legCount,
  isExpanded,
  onToggle,
  onOpen,
}: {
  row: PortfolioPurchase;
  icons: IndexIcon[];
  legCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <tr className="border-t border-line">
      <td className={CELL}>
        <TypeCell
          row={row}
          legCount={legCount}
          isExpanded={isExpanded}
          onToggle={onToggle}
        />
      </td>
      <td className={CELL}>
        <IndexLink
          indexId={row.indexId}
          indexName={row.indexName}
          icons={icons}
        />
      </td>
      <td className={CELL}>
        <PaidCell row={row} />
      </td>
      <td className={CELL}>
        <RouteCell viaAurora={row.chainId !== "monad"} />
      </td>
      <td className={`${CELL} tabular-nums`}>{formatUsd(row.valueUsd)}</td>
      <td className={CELL}>
        <StatusCell status={row.status} onOpen={onOpen} />
      </td>
      <td className={`${CELL} text-right`}>
        {row.txHash && <TxLink href={explorerUrl(row.chainId, row.txHash)} />}
        <span className="block text-xs text-ink-subtle">
          <LocalDate iso={row.at} />
        </span>
      </td>
    </tr>
  );
}

function Pager({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  const button =
    "rounded-full px-3 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink disabled:pointer-events-none disabled:opacity-40";
  return (
    <nav
      aria-label="Activity pages"
      className="flex items-center justify-end gap-2 px-6 py-4"
    >
      <button
        type="button"
        className={button}
        disabled={page === 0}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </button>
      <span className="text-sm text-ink-subtle tabular-nums">
        {page + 1} / {pageCount}
      </span>
      <button
        type="button"
        className={button}
        disabled={page >= pageCount - 1}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}

function legsByExecution(activity: PortfolioActivity[]) {
  const legs = new Map<string, PortfolioActivity[]>();
  for (const leg of activity)
    if (leg.executionId)
      legs.set(leg.executionId, [...(legs.get(leg.executionId) ?? []), leg]);
  return legs;
}

function useExpanded() {
  const [expanded, setExpanded] = useState(() => new Set<string>());
  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return { expanded, toggle };
}

function TableHead() {
  return (
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
  );
}

export function ActivityHistory({
  rows,
  activity,
  indexIcons,
}: {
  rows: PortfolioPurchase[];
  activity: PortfolioActivity[];
  indexIcons: Record<string, IndexIcon[]>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const { expanded, toggle } = useExpanded();
  const legs = legsByExecution(activity);
  const pageCount = Math.ceil(rows.length / PAGE_SIZE);
  const shown = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const open = rows.find((row) => row.id === openId) ?? null;
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="px-6 pt-6 pb-2 text-left text-sm text-ink-muted">
          Transaction history
        </caption>
        <TableHead />
        <tbody>
          {shown.map((row) => (
            <ActivityGroup
              key={row.id}
              row={row}
              legs={legs.get(row.id) ?? []}
              icons={indexIcons[row.indexId] ?? []}
              isExpanded={expanded.has(row.id)}
              onToggle={() => toggle(row.id)}
              onOpen={() => setOpenId(row.id)}
            />
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="px-6 pb-6 text-sm text-ink-muted">
          No activity yet. Every index you create, buy or sell shows up here.
        </p>
      )}
      <Pager page={page} pageCount={pageCount} onPage={setPage} />
      <ExecutionStatusModal purchase={open} onClose={() => setOpenId(null)} />
    </Card>
  );
}

function ActivityGroup({
  row,
  legs,
  icons,
  isExpanded,
  onToggle,
  onOpen,
}: {
  row: PortfolioPurchase;
  legs: PortfolioActivity[];
  icons: IndexIcon[];
  isExpanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <>
      <PurchaseRow
        row={row}
        icons={icons}
        legCount={legs.length}
        isExpanded={isExpanded}
        onToggle={onToggle}
        onOpen={onOpen}
      />
      {isExpanded && legs.map((leg) => <LegRow key={leg.id} leg={leg} />)}
    </>
  );
}
