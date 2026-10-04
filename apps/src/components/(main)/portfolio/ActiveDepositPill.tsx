"use client";

import { ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { isRunning, usePortfolio } from "@/features/portfolio";
import { ExecutionStatusModal } from "./ExecutionStatusModal";

function pillLabel(count: number, status: string): string {
  if (count > 1) return `${count} running`;
  return status === "bridging" ? "Bridging" : "Executing";
}

export function ActiveDepositPill() {
  const portfolio = usePortfolio();
  const [isOpen, setIsOpen] = useState(false);
  const running = (portfolio.data?.purchases ?? []).filter((p) =>
    isRunning(p.status),
  );
  const latest = running[0];
  if (!latest && !isOpen) return null;
  return (
    <>
      {latest && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={`${pillLabel(running.length, latest.status)}, view status`}
          className="group flex items-center gap-2 rounded-full border border-line py-1.5 pr-2 pl-2.5 text-sm transition-colors duration-200 hover:border-ink-subtle hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Loader2 aria-hidden className="size-4 animate-spin text-brand" />
          {pillLabel(running.length, latest.status)}
          <ChevronRight
            aria-hidden
            className="size-3.5 text-ink-subtle transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </button>
      )}
      <ExecutionStatusModal
        purchase={isOpen ? (latest ?? null) : null}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
