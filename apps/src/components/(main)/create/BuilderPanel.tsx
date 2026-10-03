import type { ReactNode } from "react";
import type { IndexDraft } from "@/hooks/useIndexDraft";
import type { Chain, Venue } from "@/types/market";
import { RouteDetails } from "../routing/RouteDetails";
import { TokenButton } from "../token-select/TokenButton";
import { AssetPicker } from "./AssetPicker";
import { SubmitBar } from "./SubmitBar";
import { WeightControls } from "./WeightControls";

interface BuilderPanelProps {
  draft: IndexDraft;
  errors: string[];
  venues: Venue[];
  chain?: Chain;
  onPickToken: () => void;
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="flex items-center gap-2 text-xs text-ink-muted">
        <span className="flex size-5 items-center justify-center rounded-full bg-surface text-[0.65rem] font-medium text-ink">
          {number}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function AmountRow({
  draft,
  chain,
  onPickToken,
}: Pick<BuilderPanelProps, "draft" | "chain" | "onPickToken">) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-1">
      <label htmlFor="create-amount" className="sr-only">
        Amount to deposit
      </label>
      <input
        id="create-amount"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        value={draft.amount}
        onChange={(e) =>
          draft.update({ amount: e.target.value.replace(/[^0-9.]/g, "") })
        }
        className="w-full min-w-0 bg-transparent text-2xl font-light outline-none placeholder:text-ink-subtle"
      />
      <TokenButton
        token={draft.depositToken}
        chain={chain}
        onClick={onPickToken}
      />
    </div>
  );
}

function submitLabel(draft: IndexDraft): string {
  if (!draft.flow.isAuthenticated) return "Log in to create";
  return Number(draft.amount) > 0 ? "Create and deposit" : "Create";
}

export function BuilderPanel({
  draft,
  errors,
  venues,
  chain,
  onPickToken,
}: BuilderPanelProps) {
  const matches = Object.fromEntries(
    draft.allocations.map((a) => [a.asset.symbol, a.venue]),
  );
  return (
    <div className="flex flex-col gap-5 rounded-md bg-surface-raised p-4 lg:sticky lg:top-24 lg:self-start">
      <Step number={1} title="Name your index">
        <label htmlFor="index-name" className="sr-only">
          Index name
        </label>
        <input
          id="index-name"
          value={draft.name}
          onChange={(e) => draft.update({ name: e.target.value })}
          placeholder="My Monad Yield"
          className="rounded-md border border-line bg-surface px-3 py-2 outline-none placeholder:text-ink-subtle focus:border-accent"
        />
      </Step>
      <Step number={2} title="Pick assets on Monad">
        <AssetPicker
          assets={draft.availableAssets}
          venues={venues}
          selectedSymbols={draft.assetSymbols}
          matches={matches}
          onToggle={draft.toggleAsset}
        />
        <WeightControls
          mode={draft.weightMode}
          onModeChange={(weightMode) => draft.update({ weightMode })}
          allocations={draft.allocations}
          customPercents={draft.customPercents}
          onPercentChange={draft.setCustomPercent}
        />
      </Step>
      <Step number={3} title="First deposit (optional)">
        <AmountRow draft={draft} chain={chain} onPickToken={onPickToken} />
        <RouteDetails chain={chain} sliceCount={draft.allocations.length} />
      </Step>
      <SubmitBar
        errors={errors}
        label={submitLabel(draft)}
        isDisabled={draft.flow.isAuthenticated && errors.length > 0}
        onSubmit={draft.flow.review}
      />
    </div>
  );
}
