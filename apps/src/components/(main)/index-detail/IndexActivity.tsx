"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Card, CryptoIcon, LocalDate } from "@/components/ui";
import { TX_EXPLORER_URL } from "@/config/explorer";
import { monadToken } from "@/features/chain/config/tokens";
import { type ActivityRow, useIndexActivity } from "@/features/executions";
import type { Venue } from "@/types/market";
import { formatAmount, formatUsd, shortenAddress } from "@/utils/format";
import { RouteCell } from "../flow/RouteCell";
import { TxLink } from "../flow/TxLink";

const HEAD =
  "px-3 py-3 text-left text-[0.7rem] font-medium tracking-wider text-ink-subtle uppercase first:pl-6 last:pr-6";
const CELL = "px-3 py-4 first:pl-6 last:pr-6";

function DirectionCell({ row }: { row: ActivityRow }) {
  const isDeposit = row.direction === "in";
  const Icon = isDeposit ? ArrowDownLeft : ArrowUpRight;
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <Icon
        aria-hidden
        className={`size-4 ${isDeposit ? "text-positive" : "text-ink-muted"}`}
      />
      {isDeposit ? "Deposit" : "Withdraw"}
    </span>
  );
}

function AssetCell({ row, venue }: { row: ActivityRow; venue?: Venue }) {
  return (
    <span className="flex items-center gap-3">
      <CryptoIcon
        iconKey={monadToken(row.assetSymbol)?.iconKey ?? "usdc"}
        label={row.assetSymbol}
        badgeIconKey="monad"
        size={28}
      />
      <span className="flex flex-col">
        <span className="whitespace-nowrap">
          {formatAmount(row.amount)}{" "}
          <span className="text-ink-muted">{row.assetSymbol}</span>
        </span>
        <span className="text-xs text-ink-muted">
          {venue?.name ?? row.venueId}
        </span>
      </span>
    </span>
  );
}

function TxCell({ row }: { row: ActivityRow }) {
  return (
    <>
      <TxLink href={`${TX_EXPLORER_URL}${row.txHash}`} />
      <span className="block text-xs text-ink-subtle">
        <LocalDate iso={row.at} />
      </span>
    </>
  );
}

function ActivityTableRow({ row, venue }: { row: ActivityRow; venue?: Venue }) {
  return (
    <tr className="border-t border-line transition-colors duration-200 hover:bg-surface-raised">
      <td className={CELL}>
        <DirectionCell row={row} />
      </td>
      <td className={CELL}>
        <AssetCell row={row} venue={venue} />
      </td>
      <td className={CELL}>
        <RouteCell viaAurora={row.viaAurora} />
      </td>
      <td className={`${CELL} tabular-nums`}>{formatUsd(row.valueUsd)}</td>
      <td className={`${CELL} font-mono text-xs text-ink-muted`}>
        {row.account ? shortenAddress(row.account) : ""}
      </td>
      <td className={`${CELL} text-right`}>
        <TxCell row={row} />
      </td>
    </tr>
  );
}

function statusText(activity: ReturnType<typeof useIndexActivity>) {
  if (activity.isPending) return "Loading activity.";
  if (activity.isError) return "Could not load the activity. Try again later.";
  if (activity.data.rows.length === 0) return "No deposits or withdrawals yet.";
  return null;
}

function TableHead() {
  return (
    <thead>
      <tr>
        {["Activity", "Amount", "Route", "Value", "Account"].map((label) => (
          <th key={label} scope="col" className={HEAD}>
            {label}
          </th>
        ))}
        <th scope="col" className={`${HEAD} text-right`}>
          Transaction
        </th>
      </tr>
    </thead>
  );
}

export function IndexActivity({
  indexId,
  venues,
}: {
  indexId: string;
  venues: Venue[];
}) {
  const activity = useIndexActivity(indexId);
  const status = statusText(activity);
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="px-6 pt-6 pb-2 text-left text-sm text-ink-muted">
          Activity
        </caption>
        <TableHead />
        <tbody>
          {(activity.data?.rows ?? []).map((row) => (
            <ActivityTableRow
              key={row.id}
              row={row}
              venue={venues.find((v) => v.id === row.venueId)}
            />
          ))}
        </tbody>
      </table>
      {status && <p className="px-6 pb-6 text-sm text-ink-muted">{status}</p>}
    </Card>
  );
}
