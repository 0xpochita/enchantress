"use client";

import { Card, SegmentedControl } from "@/components/ui";
import { type IndexDraft, useIndexDraft } from "@/hooks/useIndexDraft";
import type { DraftCatalog } from "@/utils/draft";
import { RoutingDiagram } from "../routing/RoutingDiagram";
import { toRoutingSource } from "../routing/routing-source";
import type { TokenCatalog } from "../token-select/TokenSelectModal";
import { AssetPicker } from "./AssetPicker";
import { DepositSection } from "./DepositSection";
import { DraftSummary } from "./DraftSummary";
import { FormSection } from "./FormSection";
import { WeightsPanel } from "./WeightsPanel";

interface CreateIndexFormProps {
  catalog: DraftCatalog;
  tokenCatalog: TokenCatalog;
}

export function CreateIndexForm({
  catalog,
  tokenCatalog,
}: CreateIndexFormProps) {
  const draft = useIndexDraft(catalog);
  return (
    <>
      <h1 className="text-3xl font-light tracking-tight">Create an index</h1>
      <DraftSummary apy={draft.apy} rewardsUsd={draft.rewardsUsd} />
      <div className="grid gap-6 lg:grid-cols-2">
        <IndexDetailsCard
          draft={draft}
          catalog={catalog}
          tokenCatalog={tokenCatalog}
        />
        <RoutingCard draft={draft} tokenCatalog={tokenCatalog} />
      </div>
    </>
  );
}

function IndexDetailsCard({
  draft,
  catalog,
  tokenCatalog,
}: { draft: IndexDraft } & CreateIndexFormProps) {
  const aggregatorIds = catalog.aggregators.map((a) => a.id);
  const aggregatorName = (id: string) =>
    catalog.aggregators.find((a) => a.id === id)?.name ?? id;
  return (
    <Card className="flex flex-col">
      <FormSection title="Name" htmlFor="index-name">
        <input
          id="index-name"
          value={draft.name}
          onChange={(e) => draft.update({ name: e.target.value })}
          placeholder="core-v1"
          className="bg-transparent text-2xl outline-none placeholder:text-ink-subtle"
        />
      </FormSection>
      <FormSection title="Aggregator">
        <SegmentedControl
          label="Aggregator"
          options={aggregatorIds}
          value={draft.aggregatorId}
          onChange={(id) => draft.update({ aggregatorId: id })}
          getLabel={aggregatorName}
        />
      </FormSection>
      <FormSection title="Assets">
        <AssetPicker
          assets={draft.availableAssets}
          selectedSymbols={draft.assetSymbols}
          onToggle={draft.toggleAsset}
        />
      </FormSection>
      <DepositSection draft={draft} tokenCatalog={tokenCatalog} />
    </Card>
  );
}

function RoutingCard({
  draft,
  tokenCatalog,
}: {
  draft: IndexDraft;
  tokenCatalog: TokenCatalog;
}) {
  const chain = tokenCatalog.chains.find(
    (c) => c.id === draft.depositToken?.chainId,
  );
  return (
    <Card className="flex min-w-0 flex-col gap-6 p-6">
      <h2 className="text-sm text-ink-muted">Routing</h2>
      {draft.allocations.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink-subtle">
          Pick assets to see where your deposit goes.
        </p>
      ) : (
        <RoutingDiagram
          source={toRoutingSource(draft.depositToken, chain)}
          allocations={draft.allocations}
        />
      )}
      <WeightsPanel
        mode={draft.weightMode}
        onModeChange={(weightMode) => draft.update({ weightMode })}
        allocations={draft.allocations}
        customPercents={draft.customPercents}
        onPercentChange={draft.setCustomPercent}
      />
    </Card>
  );
}
