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
  onConfirm: () => void;
}

export function ConfirmStep({ draft, chain, onConfirm }: ConfirmStepProps) {
  const items = [
    {
      label: "Deposit",
      value: `${formatAmount(Number(draft.amount))} ${draft.depositToken?.symbol ?? ""}`,
      hint: formatUsd(draft.depositUsd),
    },
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
      <ReviewHeader eyebrow="Review your index" title={draft.name} />
      <ReviewSummary items={items} />
      <SliceList slices={draft.allocations} />
      <RouteDetails chain={chain} sliceCount={draft.allocations.length} />
      <ReviewActions onCancel={draft.dismiss} onConfirm={onConfirm} />
    </div>
  );
}
