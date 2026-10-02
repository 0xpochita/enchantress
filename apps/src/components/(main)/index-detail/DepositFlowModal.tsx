"use client";

import type { useDepositAction } from "@/hooks/useDepositAction";
import type { RoutedAllocation, WalletBalance } from "@/types/market";
import { formatAmount, formatPercent, formatUsd } from "@/utils/format";
import { yearlyRewardsUsd } from "@/utils/yield-index";
import { FlowModal, PendingStep } from "../flow/FlowModal";
import { ActionButton, ResultStep } from "../flow/ResultStep";
import {
  ReviewActions,
  ReviewHeader,
  type ReviewItem,
  ReviewSummary,
  SliceList,
} from "../flow/ReviewParts";
import { RouteDetails } from "../routing/RouteDetails";

type DepositPanel = ReturnType<typeof useDepositAction>;

interface DepositFlowModalProps {
  panel: DepositPanel;
  indexName: string;
  allocations: RoutedAllocation[];
  apy: number;
  balances: WalletBalance[];
}

interface FlowContext extends DepositFlowModalProps {
  isDeposit: boolean;
  balance: number;
  availableUsd: number;
}

function reviewItems(context: FlowContext): ReviewItem[] {
  const { panel, isDeposit, availableUsd } = context;
  return [
    {
      label: panel.action,
      value: `${formatAmount(Number(panel.amount))} ${panel.token?.symbol ?? ""}`,
      hint: formatUsd(panel.valueUsd),
    },
    { label: "Index APY", value: formatPercent(context.apy), hint: "blended" },
    isDeposit
      ? {
          label: "Rewards / year",
          value: formatUsd(yearlyRewardsUsd(panel.valueUsd, context.apy)),
          hint: "at current rates",
        }
      : {
          label: "Remaining",
          value: formatUsd(Math.max(0, availableUsd - panel.valueUsd)),
          hint: "in this index",
        },
  ];
}

function ConfirmStep(context: FlowContext) {
  const { panel, allocations } = context;
  return (
    <div className="flex flex-col gap-5 p-6">
      <ReviewHeader
        eyebrow={`Review your ${panel.action.toLowerCase()}`}
        title={context.indexName}
      />
      <ReviewSummary items={reviewItems(context)} />
      <SliceList slices={allocations} />
      <RouteDetails chain={panel.chain} sliceCount={allocations.length} />
      <ReviewActions
        onCancel={panel.dismiss}
        onConfirm={() => confirm(context)}
      />
    </div>
  );
}

function confirm({ panel, isDeposit, balance, availableUsd }: FlowContext) {
  const canSucceed = isDeposit
    ? Number(panel.amount) <= balance
    : panel.valueUsd <= availableUsd;
  panel.confirm(canSucceed);
}

function SuccessStep({ panel, isDeposit, indexName, apy }: FlowContext) {
  const usd = formatUsd(panel.valueUsd);
  return (
    <ResultStep
      tone="success"
      title={isDeposit ? "Deposit complete" : "Withdrawal complete"}
      message={
        isDeposit
          ? `${usd} is now earning ${formatPercent(apy)} APY in ${indexName}.`
          : `${usd} from ${indexName} is on its way to your wallet.`
      }
      actions={
        <ActionButton label="Done" variant="primary" onClick={panel.finish} />
      }
    />
  );
}

function FailedStep({ panel, isDeposit, balance, availableUsd }: FlowContext) {
  const symbol = panel.token?.symbol ?? "";
  return (
    <ResultStep
      tone="failed"
      title={isDeposit ? "Deposit failed" : "Withdrawal failed"}
      message={
        isDeposit
          ? `Not enough ${symbol} in your wallet. You have ${formatAmount(balance)} ${symbol}.`
          : `You can withdraw up to ${formatUsd(availableUsd)} from this index.`
      }
      actions={
        <>
          <ActionButton
            label="Close"
            variant="secondary"
            onClick={panel.dismiss}
          />
          <ActionButton
            label="Try again"
            variant="primary"
            onClick={panel.review}
          />
        </>
      }
    />
  );
}

function pendingCopy({
  panel,
  isDeposit,
  indexName,
  allocations,
}: FlowContext) {
  const count = new Set(allocations.map((a) => a.venue.id)).size;
  return {
    title: isDeposit
      ? `Depositing into ${indexName}`
      : `Withdrawing from ${indexName}`,
    message: `${isDeposit ? "Splitting" : "Collecting"} ${formatUsd(panel.valueUsd)} across ${count} protocol${count === 1 ? "" : "s"} on Monad.`,
  };
}

export function DepositFlowModal(props: DepositFlowModalProps) {
  const { panel, allocations, balances } = props;
  const context: FlowContext = {
    ...props,
    isDeposit: panel.action === "Deposit",
    balance: balances.find((b) => b.tokenId === panel.tokenId)?.amount ?? 0,
    availableUsd: allocations.reduce((sum, a) => sum + a.valueUsd, 0),
  };
  return (
    <FlowModal
      flow={panel}
      label={panel.action}
      steps={{
        confirming: <ConfirmStep {...context} />,
        pending: <PendingStep {...pendingCopy(context)} />,
        success: <SuccessStep {...context} />,
        failed: <FailedStep {...context} />,
      }}
    />
  );
}
