"use client";

import { VAULT_CHAIN_ID } from "@/features/vaults/config/venues";
import type { IndexDraft } from "@/hooks/useIndexDraft";
import type { Chain } from "@/types/market";
import { formatPercent, formatUsd } from "@/utils/format";
import { ProgressStep } from "../aggregators/RouteFlowModal";
import { FlowModal, PendingStep } from "../flow/FlowModal";
import { ActionButton, ActionLink, ResultStep } from "../flow/ResultStep";
import { ConfirmStep } from "./ConfirmStep";

interface CreateFlowModalProps {
  draft: IndexDraft;
  chain?: Chain;
}

function indexHref(draft: IndexDraft): string {
  return draft.flow.indexId ? `/indexes/${draft.flow.indexId}` : "/invest";
}

function successMessage(draft: IndexDraft): string {
  const name = draft.recipe.name;
  if (!draft.flow.hasDeposit)
    return `${name} is ready. Only you can see it until it holds deposits.`;
  return `${name} is live with ${formatUsd(draft.depositUsd)} earning ${formatPercent(draft.apy)} APY.`;
}

function SuccessStep({ draft }: { draft: IndexDraft }) {
  return (
    <ResultStep
      tone="success"
      title="Index created"
      message={successMessage(draft)}
      actions={
        <>
          <ActionButton
            label="Create another"
            variant="secondary"
            onClick={draft.flow.finish}
          />
          <ActionLink href={indexHref(draft)} label="View index" />
        </>
      }
    />
  );
}

function FailedStep({ draft }: { draft: IndexDraft }) {
  const isIndexCreated = draft.flow.indexId !== null;
  return (
    <ResultStep
      tone="failed"
      title={
        isIndexCreated
          ? "Index created, deposit did not finish"
          : "Could not create index"
      }
      message={
        draft.flow.errorMessage ??
        "Something went wrong. Your funds stay in your wallet."
      }
      actions={
        <>
          <ActionButton
            label="Close"
            variant="secondary"
            onClick={draft.flow.dismiss}
          />
          {isIndexCreated ? (
            <ActionLink href={indexHref(draft)} label="View index" />
          ) : (
            <ActionButton
              label="Try again"
              variant="primary"
              onClick={draft.flow.review}
            />
          )}
        </>
      }
    />
  );
}

function PendingContent({ draft }: { draft: IndexDraft }) {
  if (draft.flow.indexId && draft.flow.hasDeposit)
    return (
      <ProgressStep
        bridge={draft.flow.deposit}
        deposit={{
          isCrossChain: draft.depositToken?.chainId !== VAULT_CHAIN_ID,
          amount: draft.amount,
          token: draft.depositToken,
        }}
      />
    );
  return (
    <PendingStep
      title={`Creating ${draft.recipe.name}`}
      message="Checking every asset has a protocol and a swap route on Monad."
    />
  );
}

export function CreateFlowModal({ draft, chain }: CreateFlowModalProps) {
  return (
    <FlowModal
      flow={draft.flow}
      label="Create index"
      steps={{
        confirming: <ConfirmStep draft={draft} chain={chain} />,
        pending: <PendingContent draft={draft} />,
        success: <SuccessStep draft={draft} />,
        failed: <FailedStep draft={draft} />,
      }}
    />
  );
}
