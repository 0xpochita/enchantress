"use client";

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
import { ExecutionSteps } from "./ExecutionSteps";
import type { IndexTokenDeposit } from "./useIndexTokenDeposit";

interface DepositFlowModalProps {
  deposit: IndexTokenDeposit;
  indexName: string;
  allocations: RoutedAllocation[];
  apy: number;
  chain?: Chain;
}

const STAGE_TEXT: Partial<Record<IndexTokenDeposit["stage"], string>> = {
  permission: "Waiting for your permission",
  quote: "Getting a quote",
  sign: "Confirm the transfer in your wallet",
  submit: "Sending your transfer",
  bridging: "Bridging to Monad through Aurora Intents",
};

function ProgressStep({ deposit }: { deposit: IndexTokenDeposit }) {
  const execution = deposit.execution;
  const stageText = deposit.isCrossChain
    ? STAGE_TEXT[deposit.stage]
    : undefined;
  return (
    <div className="flex flex-col gap-5 p-6">
      <ReviewHeader
        eyebrow={
          deposit.isCrossChain
            ? `From ${deposit.chain?.name ?? "your chain"} to Monad`
            : "Depositing on Monad"
        }
        title={
          execution
            ? `${formatAmount(Number(deposit.amount))} ${deposit.token.symbol}`
            : "Starting"
        }
      />
      {stageText && <p className="text-sm text-ink-muted">{stageText}</p>}
      <ExecutionSteps
        execution={execution}
        fallbackAsset={deposit.token.symbol}
      />
      <p className="text-xs text-ink-subtle">
        You can close this window. The deposit keeps going and shows up in your
        portfolio.
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
      <RouteDetails
        chain={deposit.chain ?? chain}
        sliceCount={allocations.length}
      />
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
