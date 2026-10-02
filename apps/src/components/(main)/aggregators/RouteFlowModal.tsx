"use client";

import { TokenStack } from "@/components/ui";
import type { DepositRoutes } from "@/hooks/useDepositRoutes";
import type { IndexQuote } from "@/types/market";
import { formatAmount, formatPercent, formatUsd } from "@/utils/format";
import { FlowModal, PendingStep } from "../flow/FlowModal";
import { ActionButton, ActionLink, ResultStep } from "../flow/ResultStep";
import {
  ReviewActions,
  ReviewHeader,
  ReviewSummary,
} from "../flow/ReviewParts";
import { RouteDetails } from "../routing/RouteDetails";

interface RouteFlowProps {
  deposit: DepositRoutes;
  quote: IndexQuote;
}

function VenueRow({ quote }: { quote: IndexQuote }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <TokenStack
        items={quote.venues.map((v) => ({ iconKey: v.iconKey, label: v.name }))}
        size={24}
      />
      <span className="text-ink-muted">
        {quote.venues.length > 1 ? "Split across" : "Goes into"}{" "}
        {quote.venues.map((v) => v.name).join(" · ")}
      </span>
    </div>
  );
}

function ConfirmStep({ deposit, quote }: RouteFlowProps) {
  const apy = deposit.selected?.apy ?? quote.apy;
  const items = [
    {
      label: "Deposit",
      value: `${formatAmount(Number(deposit.amount))} ${deposit.token?.symbol ?? ""}`,
      hint: formatUsd(deposit.amountUsd),
    },
    { label: "APY", value: formatPercent(apy), hint: "best route" },
    {
      label: "Rewards / year",
      value: formatUsd(deposit.selected?.yearlyUsd ?? 0),
      hint: "at current rates",
    },
  ];
  return (
    <div className="flex flex-col gap-5 p-6">
      <ReviewHeader eyebrow="Review your deposit" title={quote.name} />
      <ReviewSummary items={items} />
      <VenueRow quote={quote} />
      <RouteDetails chain={deposit.chain} sliceCount={quote.assets.length} />
      <ReviewActions
        onCancel={deposit.dismiss}
        onConfirm={() => deposit.confirm(!deposit.isInsufficient)}
      />
    </div>
  );
}

function SuccessStep({ deposit, quote }: RouteFlowProps) {
  const apy = formatPercent(deposit.selected?.apy ?? quote.apy);
  return (
    <ResultStep
      tone="success"
      title="Deposit complete"
      message={`${formatUsd(deposit.amountUsd)} is now earning ${apy} APY in ${quote.name}.`}
      actions={
        <>
          <ActionButton
            label="Done"
            variant="secondary"
            onClick={deposit.finish}
          />
          <ActionLink href={`/indexes/${quote.id}`} label="View index" />
        </>
      }
    />
  );
}

function FailedStep({ deposit }: { deposit: DepositRoutes }) {
  const symbol = deposit.token?.symbol ?? "";
  return (
    <ResultStep
      tone="failed"
      title="Deposit failed"
      message={`Not enough ${symbol} in your wallet. You have ${formatAmount(deposit.balance)} ${symbol}.`}
      actions={
        <>
          <ActionButton
            label="Close"
            variant="secondary"
            onClick={deposit.dismiss}
          />
          <ActionButton
            label="Try again"
            variant="primary"
            onClick={deposit.review}
          />
        </>
      }
    />
  );
}

export function RouteFlowModal({
  deposit,
  quote,
}: {
  deposit: DepositRoutes;
  quote?: IndexQuote;
}) {
  if (!quote) return null;
  const count = quote.venues.length;
  return (
    <FlowModal
      flow={deposit}
      label="Deposit"
      steps={{
        confirming: <ConfirmStep deposit={deposit} quote={quote} />,
        pending: (
          <PendingStep
            title={`Depositing into ${quote.name}`}
            message={`Routing ${formatUsd(deposit.amountUsd)} into ${count} protocol${count === 1 ? "" : "s"} on Monad.`}
          />
        ),
        success: <SuccessStep deposit={deposit} quote={quote} />,
        failed: <FailedStep deposit={deposit} />,
      }}
    />
  );
}
