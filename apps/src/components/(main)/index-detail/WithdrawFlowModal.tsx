"use client";

import { TX_EXPLORER_URL } from "@/config/explorer";
import type { IndexWithdrawController } from "@/features/executions";
import { formatUsd } from "@/utils/format";
import { FlowModal } from "../flow/FlowModal";
import { ActionButton, ResultStep } from "../flow/ResultStep";
import {
  ReviewActions,
  ReviewHeader,
  ReviewSummary,
} from "../flow/ReviewParts";
import { ExecutionSteps } from "./ExecutionSteps";

interface WithdrawFlowModalProps {
  withdraw: IndexWithdrawController;
  indexName: string;
}

function ConfirmStep({ withdraw, indexName }: WithdrawFlowModalProps) {
  const assets = withdraw.holdings.map((h) => h.assetSymbol).join(", ");
  const items = [
    { label: "Withdraw", value: withdraw.choice, hint: "of your position" },
    {
      label: "You receive",
      value: formatUsd(withdraw.valueUsd),
      hint: "at current prices",
    },
    { label: "Assets", value: assets || "None", hint: "in your Monad wallet" },
  ];
  return (
    <div className="flex flex-col gap-5 p-6">
      <ReviewHeader eyebrow="Review your withdrawal" title={indexName} />
      <ReviewSummary items={items} />
      {withdraw.needsDelegation && (
        <p className="text-xs text-ink-muted">
          Enchantress needs one time permission to move funds out of the vaults.
          It can only withdraw to your own wallet.
        </p>
      )}
      <ReviewActions
        onCancel={withdraw.dismiss}
        onConfirm={withdraw.confirm}
        confirmLabel={
          withdraw.needsDelegation ? "Allow and withdraw" : "Confirm"
        }
      />
    </div>
  );
}

function ProgressStep({ withdraw }: { withdraw: IndexWithdrawController }) {
  return (
    <div className="flex flex-col gap-5 p-6">
      <ReviewHeader
        eyebrow="Withdrawing on Monad"
        title={formatUsd(withdraw.valueUsd)}
      />
      <ExecutionSteps execution={withdraw.execution} fallbackAsset="" />
      <p className="text-xs text-ink-subtle">
        Gas on Monad is paid by Enchantress. Keep this page open; you can also
        come back later.
      </p>
    </div>
  );
}

function ExplorerLinks({ withdraw }: { withdraw: IndexWithdrawController }) {
  const steps = (withdraw.execution?.steps ?? []).filter((s) => s.txHash);
  return (
    <>
      {steps.map((step) => (
        <a
          key={step.position}
          href={`${TX_EXPLORER_URL}${step.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="block text-brand hover:underline"
        >
          View {step.assetSymbol} withdrawal
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ))}
    </>
  );
}

function SuccessStep({ withdraw }: { withdraw: IndexWithdrawController }) {
  return (
    <ResultStep
      tone="success"
      title="Withdrawal complete"
      message={
        <>
          Your assets are now in your Monad wallet.
          <ExplorerLinks withdraw={withdraw} />
        </>
      }
      actions={
        <ActionButton
          label="Done"
          variant="primary"
          onClick={withdraw.finish}
        />
      }
    />
  );
}

function FailedStep({ withdraw }: { withdraw: IndexWithdrawController }) {
  return (
    <ResultStep
      tone="failed"
      title="Withdrawal did not finish"
      message={
        withdraw.errorMessage ??
        "Something went wrong. Your funds stay in the vaults or your wallet."
      }
      actions={
        <>
          <ActionButton
            label="Close"
            variant="secondary"
            onClick={withdraw.dismiss}
          />
          <ActionButton
            label="Try again"
            variant="primary"
            onClick={withdraw.review}
          />
        </>
      }
    />
  );
}

export function WithdrawFlowModal(props: WithdrawFlowModalProps) {
  const { withdraw } = props;
  return (
    <FlowModal
      flow={withdraw}
      label="Withdraw"
      steps={{
        confirming: <ConfirmStep {...props} />,
        pending: <ProgressStep withdraw={withdraw} />,
        success: <SuccessStep withdraw={withdraw} />,
        failed: <FailedStep withdraw={withdraw} />,
      }}
    />
  );
}
