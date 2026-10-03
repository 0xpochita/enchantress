"use client";

import { Check, CircleDashed, Loader2, X } from "lucide-react";
import type { ExecutionView } from "@/features/executions";
import { StepLabel } from "../flow/StepLabel";

type StepView = ExecutionView["steps"][number];

function StepIcon({ status }: { status: StepView["status"] }) {
  if (status === "confirmed")
    return <Check aria-hidden className="size-4 text-positive" />;
  if (status === "failed")
    return <X aria-hidden className="size-4 text-negative" />;
  if (status === "sent")
    return <Loader2 aria-hidden className="size-4 animate-spin text-brand" />;
  return <CircleDashed aria-hidden className="size-4 text-ink-subtle" />;
}

export function ExecutionSteps({
  execution,
  fallbackAsset,
}: {
  execution?: ExecutionView;
  fallbackAsset: string;
}) {
  return (
    <ol className="flex flex-col gap-3 text-sm">
      {(execution?.steps ?? []).map((step) => (
        <li key={step.position} className="flex items-center gap-3">
          <StepIcon status={step.status} />
          <span className={step.status === "pending" ? "text-ink-muted" : ""}>
            <StepLabel
              step={step}
              depositAsset={execution?.depositAsset ?? fallbackAsset}
            />
          </span>
        </li>
      ))}
    </ol>
  );
}
