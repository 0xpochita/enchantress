import { CryptoIcon, Folder } from "@/components/ui";
import type { RoutedAllocation } from "@/types/market";
import { formatPercent, formatUsd } from "@/utils/format";

const MAX_PAPERS = 3;

function AllocationPaper({ allocation }: { allocation: RoutedAllocation }) {
  return (
    <span className="flex h-full flex-col gap-1.5 p-3 text-left">
      <span className="flex items-center gap-2">
        <CryptoIcon iconKey={allocation.asset.iconKey} label="" size={22} />
        <span className="font-medium text-sm">{allocation.asset.symbol}</span>
      </span>
      <span className="text-xs text-ink-muted">
        {formatUsd(allocation.valueUsd)}
      </span>
      <span className="flex items-center gap-1 text-xs">
        <CryptoIcon iconKey={allocation.venue.iconKey} label="" size={14} />
        <span className="truncate text-ink-muted">{allocation.venue.name}</span>
        <span className="ml-auto text-positive">
          {formatPercent(allocation.apy)}
        </span>
      </span>
    </span>
  );
}

export function FundsFolder({
  allocations,
}: {
  allocations: RoutedAllocation[];
}) {
  const hiddenCount = Math.max(0, allocations.length - MAX_PAPERS);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-[340px] items-end justify-center pb-6">
        <Folder
          label="index allocations"
          defaultOpen
          items={allocations.map((allocation) => (
            <AllocationPaper
              key={allocation.asset.symbol}
              allocation={allocation}
            />
          ))}
        />
      </div>
      {hiddenCount > 0 && (
        <p className="text-center text-xs text-ink-subtle">
          +{hiddenCount} more in the table below
        </p>
      )}
    </div>
  );
}
