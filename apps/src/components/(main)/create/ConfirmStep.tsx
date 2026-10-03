import type { IndexDraft } from "@/hooks/useIndexDraft";
import type { Chain } from "@/types/market";
import { formatAmount, formatPercent, formatUsd } from "@/utils/format";
import {
  ReviewActions,
  ReviewHeader,
  ReviewSummary,
  SliceList,
} from "../flow/ReviewParts";
import { RouteDetails } from "../routing/RouteDetails";

interface ConfirmStepProps {
  draft: IndexDraft;
  chain?: Chain;
}

function depositItem(draft: IndexDraft) {
  if (!draft.flow.hasDeposit)
    return { label: "Deposit", value: "None", hint: "add funds later" };
  return {
    label: "Deposit",
    value: `${formatAmount(Number(draft.amount))} ${draft.depositToken?.symbol ?? ""}`,
    hint: formatUsd(draft.depositUsd),
  };
}

function footnote(draft: IndexDraft): string {
  if (!draft.flow.hasDeposit)
    return "Your index is visible to you until it holds deposits.";
  if (draft.flow.needsDelegation)
    return "Enchantress needs one time permission to move your deposit into the vaults; it can only deposit or withdraw to your own wallet.";
  return "Gas on Monad is paid by Enchantress.";
}

export function ConfirmStep({ draft, chain }: ConfirmStepProps) {
  const items = [
    depositItem(draft),
    {
      label: "Blended APY",
      value: formatPercent(draft.apy),
      hint: "estimated",
    },
    {
      label: "Rewards / year",
      value: formatUsd(draft.rewardsUsd),
      hint: "at current rates",
    },
  ];
  return (
    <div className="flex flex-col gap-5 p-6">
      <ReviewHeader eyebrow="Review your index" title={draft.recipe.name} />
      <ReviewSummary items={items} />
      <SliceList slices={draft.allocations} />
      {draft.flow.hasDeposit && (
        <RouteDetails chain={chain} sliceCount={draft.allocations.length} />
      )}
      <p className="text-xs text-ink-muted">{footnote(draft)}</p>
      <ReviewActions
        onCancel={draft.flow.dismiss}
        onConfirm={draft.flow.confirm}
        confirmLabel={
          draft.flow.needsDelegation ? "Allow and create" : "Create"
        }
      />
    </div>
  );
}
