"use client";

import type { ReactNode } from "react";
import { Modal } from "@/components/ui";
import { originChainById } from "@/config/chains";
import {
  type ExecutionView,
  useExecution,
  useResumeExecution,
} from "@/features/executions";
import type { PortfolioPurchase } from "@/features/portfolio";
import { formatAmount } from "@/utils/format";
import {
  ChainLabel,
  MonadLabel,
  StageIcon,
  type Tone,
} from "../aggregators/RouteFlowModal";
import { AuroraIntents } from "../flow/AuroraIntents";
import { AURORA_HINTS } from "../flow/aurora-status";
import { ElapsedTime } from "../flow/ElapsedTime";
import { ActionButton } from "../flow/ResultStep";
import { ReviewHeader } from "../flow/ReviewParts";
import { ExecutionSteps } from "../index-detail/ExecutionSteps";

const ACTIVE = new Set(["bridging", "executing"]);
const FAILED = new Set(["failed", "refunded", "cancelled"]);

const HEADINGS: Record<string, string> = {
  bridging: "Deposit in progress",
  executing: "Deposit in progress",
  succeeded: "Deposit complete",
};

function bridgeTone(execution: ExecutionView): Tone {
  if (execution.status === "bridging") return "active";
  if (execution.status === "refunded") return "failed";
  return execution.originTxHash ? "done" : "todo";
}

function executeTone(execution: ExecutionView): Tone {
  if (execution.status === "executing") return "active";
  if (execution.status === "succeeded") return "done";
  return FAILED.has(execution.status) ? "failed" : "todo";
}

function Stage({
  tone,
  hint,
  children,
}: {
  tone: Tone;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3">
      <StageIcon tone={tone} />
      <span
        className={`flex flex-1 flex-wrap items-center gap-1.5 ${tone === "todo" ? "text-ink-muted" : ""}`}
      >
        {children}
      </span>
      {hint && <span className="text-xs text-ink-subtle">{hint}</span>}
    </li>
  );
}

function OriginLabel({
  chainId,
  purchase,
}: {
  chainId: string;
  purchase: PortfolioPurchase;
}) {
  const chain = originChainById(chainId);
  return (
    <>
      <ChainLabel iconKey={purchase.paidIconKey} name={purchase.paidSymbol} />
      {chain && (
        <>
          on <ChainLabel iconKey={chain.iconKey} name={chain.name} />
        </>
      )}
    </>
  );
}

function Stages({
  execution,
  purchase,
}: {
  execution: ExecutionView;
  purchase: PortfolioPurchase;
}) {
  return (
    <ol className="flex flex-col gap-3 text-sm">
      {execution.originChain && (
        <>
          <Stage tone={execution.originTxHash ? "done" : "active"}>
            Sent to <AuroraIntents />
          </Stage>
          <Stage
            tone={bridgeTone(execution)}
            hint={AURORA_HINTS[execution.auroraStatus ?? ""]}
          >
            <OriginLabel chainId={execution.originChain} purchase={purchase} />
            bridging to <MonadLabel />
          </Stage>
        </>
      )}
      <Stage tone={executeTone(execution)}>
        Depositing on <MonadLabel />
      </Stage>
      <li className="ml-7 text-xs">
        <ExecutionSteps execution={execution} fallbackAsset="" />
      </li>
    </ol>
  );
}

function ResumeActions({
  execution,
  onClose,
}: {
  execution: ExecutionView;
  onClose: () => void;
}) {
  const resume = useResumeExecution(execution.id);
  return (
    <div className="flex flex-col gap-3">
      {resume.error && (
        <p role="alert" className="text-sm text-negative">
          {resume.error.message}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <ActionButton label="Close" variant="secondary" onClick={onClose} />
        <ActionButton
          label={resume.isPending ? "Resuming..." : "Resume"}
          variant="primary"
          onClick={() => resume.mutate()}
          disabled={resume.isPending}
        />
      </div>
    </div>
  );
}

export function ExecutionStatusModal({
  purchase,
  onClose,
}: {
  purchase: PortfolioPurchase | null;
  onClose: () => void;
}) {
  const execution = useExecution(purchase?.id ?? null).data;
  const chain = purchase ? originChainById(purchase.chainId) : undefined;
  return (
    <Modal
      isOpen={purchase !== null}
      onClose={onClose}
      label="Deposit status"
      size="md"
    >
      <div className="flex flex-col gap-5 p-6">
        <ReviewHeader
          eyebrow={HEADINGS[execution?.status ?? ""] ?? purchase?.indexName}
          title={`${formatAmount(purchase?.paidAmount ?? 0)} ${purchase?.paidSymbol ?? ""}`}
          icons={
            purchase
              ? [
                  {
                    iconKey: purchase.paidIconKey,
                    label: purchase.paidSymbol,
                    badgeIconKey: chain?.iconKey,
                  },
                ]
              : []
          }
        />
        {execution && ACTIVE.has(execution.status) && (
          <p className="-mt-3 text-sm text-ink-muted">
            Running for <ElapsedTime since={execution.createdAt} />
          </p>
        )}
        {execution && purchase && (
          <Stages execution={execution} purchase={purchase} />
        )}
        {execution?.errorMessage && (
          <p className="text-sm text-negative">{execution.errorMessage}</p>
        )}
        {execution?.canResume ? (
          <ResumeActions
            key={execution.id}
            execution={execution}
            onClose={onClose}
          />
        ) : (
          <ActionButton label="Close" variant="secondary" onClick={onClose} />
        )}
      </div>
    </Modal>
  );
}
