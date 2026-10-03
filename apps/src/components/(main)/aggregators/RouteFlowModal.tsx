"use client";

import { Check, CircleDashed, Loader2, X } from "lucide-react";
import type { ReactNode } from "react";
import { CryptoIcon } from "@/components/ui";
import type { BridgeDepositController, QuotePreview } from "@/features/bridge";
import type { DepositRoutes } from "@/hooks/useDepositRoutes";
import type { IndexQuote } from "@/types/market";
import { formatAmount, formatPercent, formatUsd } from "@/utils/format";
import { AuroraIntents } from "../flow/AuroraIntents";
import { AURORA_HINTS } from "../flow/aurora-status";
import { ElapsedTime } from "../flow/ElapsedTime";
import { FlowModal } from "../flow/FlowModal";
import { ActionButton, ActionLink, ResultStep } from "../flow/ResultStep";
import {
  indexIcons,
  ReviewActions,
  ReviewHeader,
  ReviewSummary,
} from "../flow/ReviewParts";
import { StepLabel } from "../flow/StepLabel";
import { FundsTree } from "../index-detail/FundsTree";

interface RouteFlowModalProps {
  bridge: BridgeDepositController;
  deposit: DepositRoutes;
  quote?: IndexQuote;
  preview?: QuotePreview;
}

export type Tone = "done" | "active" | "todo" | "failed";

export function StageIcon({ tone }: { tone: Tone }) {
  if (tone === "done")
    return <Check aria-hidden className="size-4 text-positive" />;
  if (tone === "failed")
    return <X aria-hidden className="size-4 text-negative" />;
  if (tone === "active")
    return <Loader2 aria-hidden className="size-4 animate-spin text-brand" />;
  return <CircleDashed aria-hidden className="size-4 text-ink-subtle" />;
}

function DepositRoot({ deposit }: { deposit: DepositRoutes }) {
  const symbol = deposit.token?.symbol ?? "";
  return (
    <span className="flex w-fit items-center gap-2 rounded-full border border-line bg-surface-raised py-1.5 pr-3 pl-1.5 text-sm">
      <CryptoIcon
        iconKey={deposit.token?.iconKey ?? "generic"}
        label={symbol}
        badgeIconKey={deposit.chain?.iconKey}
        size={22}
      />
      <span className="font-medium">
        {formatAmount(Number(deposit.amount))} {symbol}
      </span>
      <span className="text-ink-muted">{formatUsd(deposit.amountUsd)}</span>
    </span>
  );
}

function AllocationTree({
  quote,
  deposit,
  amountUsd,
}: {
  quote: IndexQuote;
  deposit: DepositRoutes;
  amountUsd: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-ink-muted">Where your deposit goes</span>
      <div className="flex flex-col">
        <DepositRoot deposit={deposit} />
        <div className="ml-[17px] h-3 w-0.5 bg-line" />
        <div className="-mt-2 ml-[17px]">
          <FundsTree allocations={quote.allocations} depositUsd={amountUsd} />
        </div>
      </div>
    </div>
  );
}

function RouteLabel({ deposit }: { deposit: DepositRoutes }) {
  if (!deposit.isCrossChain) return "Already on Monad";
  return (
    <span className="inline-flex items-center gap-1.5">
      {deposit.chain?.name ?? "Origin"} to Monad via <AuroraIntents />
    </span>
  );
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
      <ReviewHeader title={quote.name} icons={indexIcons(quote.allocations)} />
      <ReviewSummary items={items} />
      <AllocationTree quote={quote} deposit={deposit} amountUsd={landedUsd} />
      <dl className="flex flex-col gap-2 border-t border-line pt-4 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Route</dt>
          <dd className="text-right">
            <RouteLabel deposit={deposit} />
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Arrives</dt>
          <dd>
            {deposit.isCrossChain && preview
              ? etaLabel(preview.timeEstimateSeconds)
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
          : "Gas on Monad is paid from the MON in your wallet."}
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

export function ChainLabel({
  iconKey,
  name,
}: {
  iconKey: string;
  name: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <CryptoIcon iconKey={iconKey} label="" size={14} />
      {name}
    </span>
  );
}

export function MonadLabel() {
  return <ChainLabel iconKey="monad" name="Monad" />;
}

const SECONDS_PER_MINUTE = 60;

function etaLabel(seconds: number): string {
  return `~${Math.max(1, Math.ceil(seconds / SECONDS_PER_MINUTE))} min`;
}

export function ProgressStep({
  bridge,
  deposit,
}: {
  bridge: BridgeDepositController;
  deposit: Pick<DepositRoutes, "isCrossChain" | "amount" | "token" | "chain">;
}) {
  const order = [
    "permission",
    "quote",
    "sign",
    "submit",
    "bridging",
    "executing",
  ] as const;
  const labels: Record<(typeof order)[number], ReactNode> = {
    permission: "Allow vault access",
    quote: "Getting a quote",
    sign: "Confirm in your wallet",
    submit: (
      <>
        Sent to <AuroraIntents />
      </>
    ),
    bridging: (
      <>
        {deposit.token && (
          <>
            <ChainLabel
              iconKey={deposit.token.iconKey}
              name={deposit.token.symbol}
            />
            on
          </>
        )}
        {deposit.chain && (
          <ChainLabel
            iconKey={deposit.chain.iconKey}
            name={deposit.chain.name}
          />
        )}
        bridging to <MonadLabel />
      </>
    ),
    executing: (
      <>
        Depositing on <MonadLabel />
      </>
    ),
  };
  const bridgingHint = AURORA_HINTS[bridge.execution?.auroraStatus ?? ""];
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
        icons={
          deposit.token
            ? [
                {
                  iconKey: deposit.token.iconKey,
                  label: deposit.token.symbol,
                  badgeIconKey: deposit.chain?.iconKey,
                },
              ]
            : []
        }
      />
      {bridge.execution && (
        <p className="-mt-3 text-sm text-ink-muted">
          Running for <ElapsedTime since={bridge.execution.createdAt} />
        </p>
      )}
      <ol className="flex flex-col gap-3 text-sm">
        {shown.map((stage) => (
          <li key={stage} className="flex flex-col gap-2">
            <span className="flex items-center gap-3">
              <StageIcon tone={stageTone(order, bridge.stage, stage)} />
              <span
                className={`flex flex-1 flex-wrap items-center gap-1.5 ${
                  stageTone(order, bridge.stage, stage) === "todo"
                    ? "text-ink-muted"
                    : ""
                }`}
              >
                {labels[stage]}
              </span>
              {stage === "bridging" && bridgingHint && (
                <span className="text-xs text-ink-subtle">{bridgingHint}</span>
              )}
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
      {bridge.phase === "tracking" && (
        <>
          <p className="text-xs text-ink-subtle">
            You can close this window; the deposit keeps going and shows up in
            your portfolio.
          </p>
          <ActionButton
            label="Close"
            variant="secondary"
            onClick={bridge.dismiss}
          />
        </>
      )}
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
