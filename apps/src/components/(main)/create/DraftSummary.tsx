import { Stat } from "@/components/ui";
import { formatPercent, formatUsd } from "@/utils/format";

export function DraftSummary({
  apy,
  rewardsUsd,
}: {
  apy: number;
  rewardsUsd: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-6 md:max-w-lg">
      <Stat label="Blended APY" value={formatPercent(apy)} tone="positive" />
      <Stat label="Rewards / year" value={formatUsd(rewardsUsd)} />
    </div>
  );
}
