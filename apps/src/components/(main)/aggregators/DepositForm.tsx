import { ArrowDown, ChevronRight, Wallet } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { buttonClassName, Card, TokenStack } from "@/components/ui";
import type { BridgeDepositController, QuotePreview } from "@/features/bridge";
import type { DepositRoutes } from "@/hooks/useDepositRoutes";
import type { IndexQuote } from "@/types/market";
import { formatAmount, formatPercent, formatUsd } from "@/utils/format";
import { TokenButton } from "../token-select/TokenButton";

interface DepositFormProps {
  deposit: DepositRoutes;
  quote?: IndexQuote;
  preview: { data?: QuotePreview; isPending: boolean; error?: Error };
  bridge: BridgeDepositController;
  isBalanceLoading: boolean;
}

type FormProps = Pick<DepositFormProps, "deposit" | "quote">;

const BOX = "flex flex-col gap-3 rounded-md bg-surface-raised p-5";

export function DepositForm(props: DepositFormProps) {
  const { deposit, quote } = props;
  return (
    <Card className="flex h-full flex-col gap-2 p-4">
      <SellBox deposit={deposit} isBalanceLoading={props.isBalanceLoading} />
      <span className="relative z-1 mx-auto -my-5 rounded-full border-4 border-surface bg-surface-raised p-2">
        <ArrowDown aria-hidden className="size-4 text-ink-muted" />
      </span>
      <EarnBox deposit={deposit} quote={quote} />
      <DetailsBox {...props} />
      <SubmitRow {...props} />
    </Card>
  );
}

function SellBox({
  deposit,
  isBalanceLoading,
}: {
  deposit: DepositRoutes;
  isBalanceLoading: boolean;
}) {
  const { token, chain } = deposit;
  return (
    <div
      className={`${BOX} border border-transparent focus-within:border-line`}
    >
      <label htmlFor="aggregator-amount" className="text-sm text-ink-muted">
        You deposit
      </label>
      <div className="flex items-center gap-4">
        <TokenButton token={token} chain={chain} onClick={deposit.openPicker} />
        <input
          id="aggregator-amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={deposit.amount}
          onChange={(e) =>
            deposit.setAmount(e.target.value.replace(/[^0-9.]/g, ""))
          }
          className="w-full min-w-0 bg-transparent text-right text-3xl font-light outline-none placeholder:text-ink-subtle"
        />
      </div>
      <div className="flex justify-between text-sm">
        <span
          className={`flex items-center gap-2 ${deposit.isInsufficient ? "text-negative" : "text-ink-muted"}`}
        >
          <Wallet aria-hidden className="size-4" />
          {isBalanceLoading ? "Loading" : formatAmount(deposit.balance)}{" "}
          {token?.symbol}
        </span>
        <span className="text-ink-muted">~{formatUsd(deposit.amountUsd)}</span>
      </div>
    </div>
  );
}

function EarnBox({ deposit, quote }: FormProps) {
  return (
    <div className={BOX}>
      <span className="text-sm text-ink-muted">You earn</span>
      <div className="flex items-center gap-4">
        {quote ? (
          <Link
            href={`/indexes/${quote.id}`}
            className="flex shrink-0 items-center gap-2 rounded-full border border-line py-2 pr-3 pl-2 hover:bg-surface-hover"
          >
            <TokenStack
              items={quote.venues.map((v) => ({
                iconKey: v.iconKey,
                label: v.name,
              }))}
              size={24}
            />
            {quote.name}
            <ChevronRight aria-hidden className="size-4 text-ink-muted" />
          </Link>
        ) : (
          <span className="text-ink-subtle">Enter an amount to see routes</span>
        )}
        <span className="ml-auto text-right text-3xl font-light">
          {formatUsd(deposit.selected?.yearlyUsd ?? 0)}
        </span>
      </div>
      <div className="flex justify-between text-sm text-ink-muted">
        <span>{quote?.venues.map((v) => v.name).join(" · ")}</span>
        <span>per year at {formatPercent(deposit.selected?.apy ?? 0)}</span>
      </div>
    </div>
  );
}

const MONTHS_PER_YEAR = 12;

function RouteLabel({ deposit }: { deposit: DepositRoutes }) {
  if (!deposit.isCrossChain) return <span>Already on Monad</span>;
  return (
    <span className="flex items-center gap-1.5">
      {deposit.chain?.name} via
      <Image
        src="/logo/aurora-logo.avif"
        alt=""
        width={14}
        height={15}
        className="rounded-sm"
      />
      Aurora Intents
    </span>
  );
}

function feeUsd(deposit: DepositRoutes, preview?: QuotePreview): number {
  if (!deposit.isCrossChain || !preview) return 0;
  return Math.max(0, preview.amountInUsd - preview.amountOutUsd);
}

function arrivesIn(deposit: DepositRoutes, preview?: QuotePreview): string {
  if (!deposit.isCrossChain) return "Instant";
  if (!preview) return "Quoting";
  return `~${Math.max(1, Math.ceil(preview.timeEstimateSeconds / 60))} min`;
}

function DetailsBox({ deposit, quote, preview }: DepositFormProps) {
  const rows = [
    { label: "Route", value: <RouteLabel deposit={deposit} /> },
    { label: "Arrives", value: arrivesIn(deposit, preview.data) },
    { label: "Protocols", value: quote?.venues.length ?? 0 },
    {
      label: "Rewards / month",
      value: formatUsd((deposit.selected?.yearlyUsd ?? 0) / MONTHS_PER_YEAR),
    },
    { label: "Bridge fee", value: formatUsd(feeUsd(deposit, preview.data)) },
  ];
  return (
    <dl className="mt-2 flex flex-1 flex-col justify-center gap-3 rounded-md border border-line px-5 py-4 text-sm">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-3"
        >
          <dt className="text-ink-muted">{row.label}</dt>
          <dd className="text-right tabular-nums">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function submitLabel(props: DepositFormProps): string {
  if (!props.bridge.isAuthenticated) return "Log in to deposit";
  if (props.deposit.isInsufficient) return "Not enough balance";
  if (props.deposit.isCrossChain && props.preview.error)
    return "No route right now";
  return "Deposit";
}

function SubmitRow(props: DepositFormProps) {
  const { deposit, quote, preview, bridge } = props;
  const waitingForQuote =
    deposit.isCrossChain && (preview.isPending || Boolean(preview.error));
  const isDisabled =
    bridge.isAuthenticated &&
    (!quote ||
      deposit.amountUsd <= 0 ||
      deposit.isInsufficient ||
      waitingForQuote);
  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={bridge.review}
      className={buttonClassName("primary", "mt-2 w-full py-3")}
    >
      {submitLabel(props)}
    </button>
  );
}
