"use client";

import { FolderOpen, ListTree } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useState } from "react";
import { Card } from "@/components/ui";
import { useDepositAction } from "@/hooks/useDepositAction";
import type { RoutedAllocation } from "@/types/market";
import { formatUsd } from "@/utils/format";
import {
  type TokenCatalog,
  TokenSelectModal,
} from "../token-select/TokenSelectModal";
import { DepositBar } from "./DepositBar";
import { DepositFlowModal } from "./DepositFlowModal";
import { FundsFolder } from "./FundsFolder";
import { FundsTree } from "./FundsTree";

const VIEWS = ["Tree", "Folder"] as const;
type View = (typeof VIEWS)[number];

const VIEW_ICONS = { Tree: ListTree, Folder: FolderOpen };

function ViewToggle({
  view,
  onChange,
}: {
  view: View;
  onChange: (view: View) => void;
}) {
  return (
    <fieldset className="flex gap-0.5 rounded-full bg-surface-raised p-0.5">
      <legend className="sr-only">Funds view</legend>
      {VIEWS.map((option) => {
        const Icon = VIEW_ICONS[option];
        const isActive = option === view;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isActive}
            aria-label={`${option} view`}
            title={`${option} view`}
            onClick={() => onChange(option)}
            className="relative flex size-7 items-center justify-center rounded-full text-ink-muted transition-colors duration-200 hover:text-ink aria-pressed:text-ink"
          >
            {isActive && (
              <motion.span
                layoutId="funds-view-pill"
                className="absolute inset-0 rounded-full bg-surface ring-1 ring-line"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <Icon aria-hidden className="relative size-3.5" />
          </button>
        );
      })}
    </fieldset>
  );
}

const HINTS: Record<View, string> = {
  Tree: "Grouped by the protocol each slice is deposited into.",
  Folder: "Each card is one slice of this index. Click the folder to close it.",
};

interface FundsPanelProps {
  indexName: string;
  title: string;
  allocations: RoutedAllocation[];
  summary: ReactNode;
  apy: number;
  catalog: TokenCatalog;
  defaultTokenId: string;
}

export function FundsPanel({
  indexName,
  title,
  allocations,
  summary,
  apy,
  catalog,
  defaultTokenId,
}: FundsPanelProps) {
  const [view, setView] = useState<View>("Tree");
  const panel = useDepositAction({ ...catalog, defaultTokenId });
  const hasAmount = panel.valueUsd > 0;
  const previewUsd =
    panel.action === "Deposit" ? panel.valueUsd : -panel.valueUsd;
  const heading = hasAmount
    ? `How your ${formatUsd(panel.valueUsd)} ${panel.action.toLowerCase()} is split`
    : title;
  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="border-b border-line pb-6">{summary}</div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="flex flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
          <DepositBar panel={panel} apy={apy} sliceCount={allocations.length} />
        </div>
        <div className="flex min-w-0 flex-col gap-5 lg:border-l lg:border-line lg:pl-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm text-ink-muted">{heading}</h2>
              <p className="text-xs text-ink-subtle">{HINTS[view]}</p>
            </div>
            <ViewToggle view={view} onChange={setView} />
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {view === "Tree" ? (
                <FundsTree
                  allocations={allocations}
                  previewUsd={hasAmount ? previewUsd : 0}
                />
              ) : (
                <FundsFolder allocations={allocations} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <DepositFlowModal
        panel={panel}
        indexName={indexName}
        allocations={allocations}
        apy={apy}
        balances={catalog.balances}
      />
      <TokenSelectModal
        isOpen={panel.isPickerOpen}
        onClose={panel.closePicker}
        catalog={catalog}
        selectedId={panel.tokenId}
        onSelect={(token) => panel.setTokenId(token.id)}
      />
    </Card>
  );
}
