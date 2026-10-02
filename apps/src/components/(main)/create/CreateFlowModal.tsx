"use client";

import type { IndexDraft } from "@/hooks/useIndexDraft";
import type { Chain } from "@/types/market";
import { formatAmount, formatPercent, formatUsd } from "@/utils/format";
import { FlowModal, PendingStep } from "../flow/FlowModal";
import { ActionButton, ActionLink, ResultStep } from "../flow/ResultStep";
import { ConfirmStep } from "./ConfirmStep";

interface CreateFlowModalProps {
  draft: IndexDraft;
  chain?: Chain;
  balance: number;
}

function protocolCount(draft: IndexDraft): number {
  return new Set(draft.allocations.map((a) => a.venue.id)).size;
}

function SuccessStep({ draft }: { draft: IndexDraft }) {
  return (
    <ResultStep
      tone="success"
      title="Index created"
      message={`${draft.name} is live with ${formatUsd(draft.depositUsd)} earning ${formatPercent(draft.apy)} APY.`}
      actions={
        <>
          <ActionButton
            label="Create another"
            variant="secondary"
            onClick={draft.finish}
          />
          <ActionLink href="/invest" label="View indexes" />
        </>
      }
    />
  );
}

function FailedStep({
  draft,
  balance,
}: {
  draft: IndexDraft;
  balance: number;
}) {
  const symbol = draft.depositToken?.symbol ?? "";
  return (
    <ResultStep
      tone="failed"
      title="Could not create index"
      message={`Not enough ${symbol} in your wallet. You have ${formatAmount(balance)} ${symbol}.`}
      actions={
        <>
          <ActionButton
            label="Close"
            variant="secondary"
            onClick={draft.dismiss}
          />
          <ActionButton
            label="Try again"
            variant="primary"
            onClick={draft.review}
          />
        </>
      }
    />
  );
}

export function CreateFlowModal({
  draft,
  chain,
  balance,
}: CreateFlowModalProps) {
  const count = protocolCount(draft);
  return (
    <FlowModal
      flow={draft}
      label="Create index"
      steps={{
        confirming: (
          <ConfirmStep
            draft={draft}
            chain={chain}
            onConfirm={() => draft.confirm(Number(draft.amount) <= balance)}
          />
        ),
        pending: (
          <PendingStep
            title={`Creating ${draft.name}`}
            message={`Routing ${formatUsd(draft.depositUsd)} into ${count} protocol${count === 1 ? "" : "s"} on Monad.`}
          />
        ),
        success: <SuccessStep draft={draft} />,
        failed: <FailedStep draft={draft} balance={balance} />,
      }}
    />
  );
}
