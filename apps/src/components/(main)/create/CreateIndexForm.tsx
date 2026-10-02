"use client";

import { useState } from "react";
import { Card, type StatItem, StatStrip } from "@/components/ui";
import { useIndexDraft } from "@/hooks/useIndexDraft";
import type { DraftCatalog } from "@/utils/draft";
import { formatPercent, formatUsd } from "@/utils/format";
import {
  type TokenCatalog,
  TokenSelectModal,
} from "../token-select/TokenSelectModal";
import { BuilderPanel } from "./BuilderPanel";
import { DraftPreview } from "./DraftPreview";

interface CreateIndexFormProps {
  catalog: DraftCatalog;
  tokenCatalog: TokenCatalog;
}

export function CreateIndexForm({
  catalog,
  tokenCatalog,
}: CreateIndexFormProps) {
  const draft = useIndexDraft(catalog);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const chain = tokenCatalog.chains.find(
    (c) => c.id === draft.depositToken?.chainId,
  );
  const aggregator = catalog.aggregators.find(
    (a) => a.id === draft.aggregatorId,
  );
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
      label: "Aggregator",
      value: aggregator?.name ?? "None",
      hint: "where slices are routed",
    },
  ];
  return (
    <>
      <h1 className="sr-only">Create an index</h1>
      <Card className="flex flex-col gap-5 p-6">
        <div className="border-b border-line pb-6">
          <StatStrip items={stats} />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <BuilderPanel
            draft={draft}
            catalog={catalog}
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
      <TokenSelectModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        catalog={tokenCatalog}
        selectedId={draft.depositTokenId}
        onSelect={(token) => draft.update({ depositTokenId: token.id })}
      />
    </>
  );
}
