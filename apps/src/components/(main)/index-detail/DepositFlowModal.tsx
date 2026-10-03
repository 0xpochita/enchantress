"use client";

import { Check, CircleDashed, Loader2, X } from "lucide-react";
import type {
  ExecutionView,
  IndexDepositController,
} from "@/features/executions";
import type { Chain, RoutedAllocation } from "@/types/market";
import { formatAmount, formatPercent, formatUsd } from "@/utils/format";
import { yearlyRewardsUsd } from "@/utils/yield-index";
import { FlowModal } from "../flow/FlowModal";
import { ActionButton, ResultStep } from "../flow/ResultStep";
import {
  ReviewActions,
  ReviewHeader,
  ReviewSummary,
  SliceList,
} from "../flow/ReviewParts";
import { RouteDetails } from "../routing/RouteDetails";

interface DepositFlowModalProps {
  deposit: IndexDepositController;
  indexName: string;
  allocations: RoutedAllocation[];
  apy: number;
  chain?: Chain;
}

type StepView = ExecutionView["steps"][number];

function stepLabel(step: StepView, depositAsset: string): string {
  if (step.kind === "swap")
    return `Swap ${depositAsset} to ${step.assetSymbol}`;
  if (step.kind === "approve") return `Approve ${step.assetSymbol}`;
  return `Supply ${step.assetSymbol} to ${step.venueId}`;
}

function StepIcon({ status }: { status: StepView["status"] }) {
  if (status === "confirmed")
    return <Check aria-hidden className="size-4 text-positive" />;
  if (status === "failed")
    return <X aria-hidden className="size-4 text-negative" />;
  if (status === "sent")
    return <Loader2 aria-hidden className="size-4 animate-spin text-brand" />;
  return <CircleDashed aria-hidden className="size-4 text-ink-subtle" />;
}

function ProgressStep({ deposit }: { deposit: IndexDepositController }) {
  const execution = deposit.execution;
  return (
    <div className="flex flex-col gap-5 p-6">
      <ReviewHeader
        eyebrow="Depositing on Monad"
        title={
          execution
            ? `${formatAmount(Number(deposit.amount))} ${deposit.token.symbol}`
            : "Starting"
        }
      />
      <ol className="flex flex-col gap-3 text-sm">
        {(execution?.steps ?? []).map((step) => (
          <li key={step.position} className="flex items-center gap-3">
            <StepIcon status={step.status} />
            <span className={step.status === "pending" ? "text-ink-muted" : ""}>
              {stepLabel(step, execution?.depositAsset ?? deposit.token.symbol)}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-ink-subtle">
        Gas on Monad is paid by Enchantress. Keep this page open; you can also
        come back later.
      </p>
    </div>
  );
}

function ConfirmStep({
  deposit,
  indexName,
  allocations,
  apy,
  chain,
}: DepositFlowModalProps) {
  const items = [
    {
      label: "Deposit",
      value: `${formatAmount(Number(deposit.amount))} ${deposit.token.symbol}`,
      hint: formatUsd(deposit.valueUsd),
    },
    { label: "Index APY", value: formatPercent(apy), hint: "blended" },
    {
      label: "Rewards / year",
      value: formatUsd(yearlyRewardsUsd(deposit.valueUsd, apy)),
      hint: "at current rates",
    },
  ];
  return (
    <div className="flex flex-col gap-5 p-6">
      <ReviewHeader eyebrow="Review your deposit" title={indexName} />
      <ReviewSummary items={items} />
      <SliceList slices={allocations} />
      <RouteDetails chain={chain} sliceCount={allocations.length} />
      {deposit.needsDelegation && (
        <p className="text-xs text-ink-muted">
          Enchantress needs one time permission to move your deposit into the
          vaults. It can only deposit or withdraw to your own wallet.
        </p>
      )}
      <ReviewActions
        onCancel={deposit.dismiss}
        onConfirm={deposit.confirm}
        confirmLabel={deposit.needsDelegation ? "Allow and deposit" : "Confirm"}
      />
    </div>
  );
}

export function DepositFlowModal(props: DepositFlowModalProps) {
  const { deposit, indexName } = props;
  return (
    <FlowModal
      flow={deposit}
      label="Deposit"
      steps={{
        confirming: <ConfirmStep {...props} />,
        pending: <ProgressStep deposit={deposit} />,
        success: (
          <ResultStep
            tone="success"
            title="Deposit complete"
            message={`${formatUsd(deposit.valueUsd)} is now earning in ${indexName}.`}
            actions={
              <ActionButton
                label="Done"
                variant="primary"
                onClick={deposit.finish}
              />
            }
          />
        ),
        failed: (
          <ResultStep
            tone="failed"
            title="Deposit did not finish"
            message={
              deposit.errorMessage ??
              "Something went wrong. Your funds stay in your wallet."
            }
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
        ),
      }}
    />
  );
}
