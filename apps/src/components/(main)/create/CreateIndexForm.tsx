"use client";

import { useState } from "react";
import { Card, type StatItem, StatStrip } from "@/components/ui";
import { type BridgeCatalog, useOriginBalances } from "@/features/bridge";
import { useIndexDraft } from "@/hooks/useIndexDraft";
import type { DraftCatalog } from "@/utils/draft";
import { formatPercent, formatUsd } from "@/utils/format";
import { TokenSelectModal } from "../token-select/TokenSelectModal";
import { BuilderPanel } from "./BuilderPanel";
import { CreateFlowModal } from "./CreateFlowModal";
import { DraftPreview } from "./DraftPreview";

interface CreateIndexFormProps {
  catalog: DraftCatalog;
  bridgeCatalog: BridgeCatalog;
}

function blockingErrors(errors: string[], isInsufficient: boolean): string[] {
  return isInsufficient
    ? [...errors, "Not enough balance for this deposit."]
    : errors;
}

export function CreateIndexForm({
  catalog,
  bridgeCatalog,
}: CreateIndexFormProps) {
  const draft = useIndexDraft(catalog);
  const balances = useOriginBalances();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const chain = bridgeCatalog.chains.find(
    (c) => c.id === draft.depositToken?.chainId,
  );
  const balance =
    balances.data?.find((b) => b.tokenId === draft.depositTokenId)?.amount ?? 0;
  const errors = blockingErrors(
    draft.errors,
    draft.flow.isAuthenticated && Number(draft.amount) > balance,
  );
  const protocolCount = new Set(draft.allocations.map((a) => a.venue.id)).size;
  const stats: StatItem[] = [
    {
      label: "Blended APY",
      value: formatPercent(draft.apy),
      hint: "across selected assets",
      tone: "positive",
    },
    {
      label: "Rewards / year",
      value: formatUsd(draft.rewardsUsd),
      hint: "on this deposit",
    },
    {
      label: "Assets",
      value: String(draft.allocations.length),
      hint: "slices in this index",
    },
    {
      label: "Protocols",
      value: String(protocolCount),
      hint: "chosen per asset",
    },
  ];
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h1 className="text-2xl font-light tracking-tight">Create an index</h1>
        <p className="text-sm text-ink-muted">
          Pick assets on Monad and the protocol for each, or keep the best
          paying one.
        </p>
      </div>
      <Card className="-mt-4 flex flex-col gap-4 p-5">
        <div className="border-b border-line pb-4">
          <StatStrip items={stats} />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <BuilderPanel
            draft={draft}
            errors={errors}
            venues={catalog.venues}
            chain={chain}
            onPickToken={() => setIsPickerOpen(true)}
          />
          <DraftPreview
            name={draft.name}
            allocations={draft.allocations}
            depositUsd={draft.depositUsd}
          />
        </div>
      </Card>
      <CreateFlowModal draft={draft} chain={chain} />
      <TokenSelectModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        catalog={{ ...bridgeCatalog, balances: balances.data ?? [] }}
        selectedId={draft.depositTokenId}
        onSelect={(token) => draft.update({ depositTokenId: token.id })}
      />
    </>
  );
}
