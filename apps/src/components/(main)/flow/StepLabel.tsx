import { CryptoIcon } from "@/components/ui";
import { monadToken } from "@/features/chain/config/tokens";
import type { ExecutionView } from "@/features/executions";
import { VENUE_CONFIGS } from "@/features/vaults/config/venues";

type StepView = ExecutionView["steps"][number];

function venueOf(venueId: string) {
  const venue = VENUE_CONFIGS.find((v) => v.id === venueId);
  return {
    name: venue ? venue.name.replace(/ v\d+$/i, "") : venueId,
    iconKey: venue?.iconKey,
  };
}

function tokenIcon(symbol: string): string {
  return monadToken(symbol)?.iconKey ?? symbol.toLowerCase();
}

function describe(step: StepView, swapFrom: string): string {
  const venue = venueOf(step.venueId).name;
  if (step.kind === "swap") return `Swap ${swapFrom} to ${step.assetSymbol}`;
  if (step.kind === "approve") return `Approve ${step.assetSymbol}`;
  if (step.kind === "withdraw" || step.kind === "redeem")
    return `Withdraw ${step.assetSymbol} from ${venue}`;
  return `Supply ${step.assetSymbol} to ${venue}`;
}

export function StepLabel({
  step,
  depositAsset,
  previous,
}: {
  step: StepView;
  depositAsset: string;
  previous?: StepView;
}) {
  const swapFrom =
    previous?.kind === "approve" ? previous.assetSymbol : depositAsset;
  const movesIntoVenue = step.kind !== "swap" && step.kind !== "approve";
  return (
    <span className="inline-flex items-center gap-2">
      <CryptoIcon
        iconKey={tokenIcon(step.assetSymbol)}
        label=""
        size={16}
        badgeIconKey={
          movesIntoVenue ? venueOf(step.venueId).iconKey : undefined
        }
      />
      {describe(step, swapFrom)}
    </span>
  );
}
