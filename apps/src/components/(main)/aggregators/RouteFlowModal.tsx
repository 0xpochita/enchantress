"use client";

import { Check, CircleDashed, Loader2, X } from "lucide-react";
import { TokenStack } from "@/components/ui";
import type { BridgeDepositController, QuotePreview } from "@/features/bridge";
import type { DepositRoutes } from "@/hooks/useDepositRoutes";
import type { IndexQuote } from "@/types/market";
import { formatAmount, formatPercent, formatUsd } from "@/utils/format";
import { FlowModal } from "../flow/FlowModal";
import { ActionButton, ActionLink, ResultStep } from "../flow/ResultStep";
import {
  ReviewActions,
  ReviewHeader,
  ReviewSummary,
} from "../flow/ReviewParts";
import { StepLabel } from "../flow/StepLabel";

interface RouteFlowModalProps {
  bridge: BridgeDepositController;
  deposit: DepositRoutes;
  quote?: IndexQuote;
  preview?: QuotePreview;
}

type Tone = "done" | "active" | "todo" | "failed";

function StageIcon({ tone }: { tone: Tone }) {
  if (tone === "done")
    return <Check aria-hidden className="size-4 text-positive" />;
  if (tone === "failed")
    return <X aria-hidden className="size-4 text-negative" />;
  if (tone === "active")
    return <Loader2 aria-hidden className="size-4 animate-spin text-brand" />;
  return <CircleDashed aria-hidden className="size-4 text-ink-subtle" />;
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

function routeLabel(deposit: DepositRoutes): string {
  return deposit.isCrossChain
    ? `${deposit.chain?.name ?? "Origin"} to Monad via Aurora Intents`
    : "Already on Monad";
}

function ConfirmStep({
  bridge,
  deposit,
  quote,
  preview,
}: RouteFlowModalProps & { quote: IndexQuote }) {
  const landedUsd = deposit.isCrossChain
    ? (preview?.amountOutUsd ?? deposit.amountUsd)
    : deposit.amountUsd;
  const feeUsd =
    deposit.isCrossChain && preview
      ? Math.max(0, preview.amountInUsd - preview.amountOutUsd)
      : 0;
  const items = [
    {
      label: "You send",
      value: `${formatAmount(Number(deposit.amount))} ${deposit.token?.symbol ?? ""}`,
      hint: formatUsd(deposit.amountUsd),
    },
    {
      label: "Lands on Monad",
      value: `${formatUsd(landedUsd)} USDC`,
      hint: deposit.isCrossChain ? `fee ${formatUsd(feeUsd)}` : "no bridge",
    },
    { label: "Index APY", value: formatPercent(quote.apy), hint: "best route" },
  ];
  return (
    <div className="flex flex-col gap-5 p-6">
      <ReviewHeader eyebrow="Review your deposit" title={quote.name} />
      <ReviewSummary items={items} />
      <VenueRow quote={quote} />
      <dl className="flex flex-col gap-2 border-t border-line pt-4 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Route</dt>
          <dd className="text-right">{routeLabel(deposit)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Arrives</dt>
          <dd>
            {deposit.isCrossChain && preview
              ? `~${Math.max(1, Math.ceil(preview.timeEstimateSeconds / 60))} min`
              : "Instant"}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-ink-muted">
        {deposit.isCrossChain
          ? "You confirm one transfer in your wallet. "
          : ""}
        {bridge.needsDelegation
          ? "Enchantress needs one time permission to move your deposit into the vaults; it can only deposit or withdraw to your own wallet."
          : "Gas on Monad is paid by Enchantress."}
      </p>
      <ReviewActions
        onCancel={bridge.dismiss}
        onConfirm={bridge.confirm}
        confirmLabel={bridge.needsDelegation ? "Allow and deposit" : "Confirm"}
      />
    </div>
  );
}

function stageTone(
  order: readonly string[],
  current: string,
  target: string,
): Tone {
  const currentIndex = order.indexOf(current);
  const targetIndex = order.indexOf(target);
  if (targetIndex < currentIndex) return "done";
  return targetIndex === currentIndex ? "active" : "todo";
}

export function ProgressStep({
  bridge,
  deposit,
}: {
  bridge: BridgeDepositController;
  deposit: Pick<DepositRoutes, "isCrossChain" | "amount" | "token">;
}) {
  const order = [
    "permission",
    "quote",
    "sign",
    "submit",
    "bridging",
    "executing",
  ] as const;
  const labels: Record<(typeof order)[number], string> = {
    permission: "Allow vault access",
    quote: "Getting a quote",
    sign: "Confirm the transfer in your wallet",
    submit: "Handing the transfer to Aurora",
    bridging: `Bridging to Monad${bridge.execution?.auroraStatus ? ` (${bridge.execution.auroraStatus.toLowerCase().replaceAll("_", " ")})` : ""}`,
    executing: "Depositing on Monad",
  };
  const shown = order.filter(
    (stage) =>
      (deposit.isCrossChain ||
        !["sign", "submit", "bridging"].includes(stage)) &&
      (bridge.needsDelegation || stage !== "permission"),
  );
  return (
    <div className="flex flex-col gap-5 p-6">
      <ReviewHeader
        eyebrow="Deposit in progress"
        title={`${formatAmount(Number(deposit.amount))} ${deposit.token?.symbol ?? ""}`}
      />
      <ol className="flex flex-col gap-3 text-sm">
        {shown.map((stage) => (
          <li key={stage} className="flex flex-col gap-2">
            <span className="flex items-center gap-3">
              <StageIcon tone={stageTone(order, bridge.stage, stage)} />
              <span
                className={
                  stageTone(order, bridge.stage, stage) === "todo"
                    ? "text-ink-muted"
                    : ""
                }
              >
                {labels[stage]}
              </span>
            </span>
            {stage === "executing" && bridge.stage === "executing" && (
              <ul className="ml-7 flex flex-col gap-1 text-xs text-ink-muted">
                {(bridge.execution?.steps ?? []).map((step) => (
                  <li key={step.position} className="flex items-center gap-2">
                    <StageIcon
                      tone={
                        step.status === "confirmed"
                          ? "done"
                          : step.status === "failed"
                            ? "failed"
                            : step.status === "sent"
                              ? "active"
                              : "todo"
                      }
                    />
                    <StepLabel
                      step={step}
                      depositAsset={bridge.execution?.depositAsset ?? "USDC"}
                    />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
      <p className="text-xs text-ink-subtle">
        You can close this window; the deposit keeps going and shows up in your
        portfolio.
      </p>
    </div>
  );
}

export function RouteFlowModal(props: RouteFlowModalProps) {
  const { bridge, deposit, quote } = props;
  if (!quote) return null;
  return (
    <FlowModal
      flow={bridge}
      label="Deposit"
      steps={{
        confirming: <ConfirmStep {...props} quote={quote} />,
        pending: <ProgressStep {...props} />,
        success: (
          <ResultStep
            tone="success"
            title="Deposit complete"
            message={`${formatUsd(deposit.amountUsd)} is now earning ${formatPercent(quote.apy)} APY in ${quote.name}.`}
            actions={
              <>
                <ActionButton
                  label="Done"
                  variant="secondary"
                  onClick={bridge.finish}
                />
                <ActionLink href={`/indexes/${quote.id}`} label="View index" />
              </>
            }
          />
        ),
        failed: (
          <ResultStep
            tone="failed"
            title="Deposit did not finish"
            message={
              bridge.errorMessage ??
              "Something went wrong. Your funds stay in your wallet."
            }
            actions={
              <>
                <ActionButton
                  label="Close"
                  variant="secondary"
                  onClick={bridge.dismiss}
                />
                <ActionButton
                  label="Try again"
                  variant="primary"
                  onClick={bridge.review}
                />
              </>
            }
          />
        ),
      }}
    />
  );
}
