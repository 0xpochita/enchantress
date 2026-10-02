import { ArrowRight, ExternalLink } from "lucide-react";
import { Card, CryptoIcon, TokenStack } from "@/components/ui";
import { TX_EXPLORER_URL } from "@/config/explorer";
import { getChain, getToken } from "@/lib/market";
import type { IndexTransaction, Venue } from "@/types/market";
import {
  formatAmount,
  formatShortDate,
  formatUsd,
  shortenAddress,
} from "@/utils/format";

interface TransactionHistoryProps {
  transactions: IndexTransaction[];
  indexName: string;
  protocols: Venue[];
}

const HEAD =
  "px-3 py-3 text-left text-[0.7rem] font-medium tracking-wider text-ink-subtle uppercase first:pl-6 last:pr-6";
const CELL = "px-3 py-4 first:pl-6 last:pr-6";

function SentCell({ tx }: { tx: IndexTransaction }) {
  const token = getToken(tx.tokenId);
  if (!token) return null;
  return (
    <span className="flex items-center gap-3">
      <CryptoIcon
        iconKey={token.iconKey}
        label={token.symbol}
        badgeIconKey={getChain(token.chainId)?.iconKey}
        size={28}
      />
      <span className="flex flex-col">
        <span className="whitespace-nowrap">
          {formatAmount(tx.amount)}{" "}
          <span className="text-ink-muted">{token.symbol}</span>
        </span>
        <span className="text-xs text-ink-muted">{formatUsd(tx.valueUsd)}</span>
      </span>
    </span>
  );
}

function IndexCell({
  name,
  protocols,
  valueUsd,
}: {
  name: string;
  protocols: Venue[];
  valueUsd: number;
}) {
  return (
    <span className="flex items-center gap-3">
      <TokenStack
        items={protocols.map((p) => ({ iconKey: p.iconKey, label: p.name }))}
        size={24}
      />
      <span className="flex flex-col">
        <span className="whitespace-nowrap">{name}</span>
        <span className="text-xs text-ink-muted">{formatUsd(valueUsd)}</span>
      </span>
    </span>
  );
}

function TransactionRow({
  tx,
  indexName,
  protocols,
}: { tx: IndexTransaction } & Omit<TransactionHistoryProps, "transactions">) {
  return (
    <tr className="border-t border-line transition-colors duration-200 hover:bg-surface-raised">
      <td className={CELL}>
        <SentCell tx={tx} />
      </td>
      <td className="px-1 text-ink-subtle">
        <ArrowRight aria-label="bought" className="size-4" />
      </td>
      <td className={CELL}>
        <IndexCell
          name={indexName}
          protocols={protocols}
          valueUsd={tx.valueUsd}
        />
      </td>
      <td className={`${CELL} font-mono text-xs text-ink-muted`}>
        {shortenAddress(tx.account)}
      </td>
      <td className={`${CELL} text-right`}>
        <a
          href={`${TX_EXPLORER_URL}${tx.hash}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono text-xs text-brand hover:underline"
        >
          {tx.hash.slice(0, 8)}… <ExternalLink aria-hidden className="size-3" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <span className="block text-xs text-ink-subtle">
          {formatShortDate(tx.timestamp)}
        </span>
      </td>
    </tr>
  );
}

export function TransactionHistory({
  transactions,
  indexName,
  protocols,
}: TransactionHistoryProps) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="px-6 pt-6 pb-2 text-left text-sm text-ink-muted">
          Purchase history
        </caption>
        <thead>
          <tr>
            <th scope="col" className={HEAD}>
              Paid with
            </th>
            <th scope="col" className="w-6">
              <span className="sr-only">Direction</span>
            </th>
            <th scope="col" className={HEAD}>
              Index bought
            </th>
            <th scope="col" className={HEAD}>
              Account
            </th>
            <th scope="col" className={`${HEAD} text-right`}>
              Transaction
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <TransactionRow
              key={tx.hash}
              tx={tx}
              indexName={indexName}
              protocols={protocols}
            />
          ))}
        </tbody>
      </table>
      {transactions.length === 0 && (
        <p className="px-6 pb-6 text-sm text-ink-muted">No purchases yet.</p>
      )}
    </Card>
  );
}
