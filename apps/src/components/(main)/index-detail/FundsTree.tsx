import { BranchedMenu, type BranchSection, CryptoIcon } from "@/components/ui";
import type { RoutedAllocation } from "@/types/market";
import { formatPercent, formatUsd } from "@/utils/format";

function groupByVenue(allocations: RoutedAllocation[]): BranchSection[] {
  const venueIds = [...new Set(allocations.map((a) => a.venue.id))];
  return venueIds.map((venueId) => {
    const slices = allocations.filter((a) => a.venue.id === venueId);
    const venue = slices[0].venue;
    const totalUsd = slices.reduce((sum, a) => sum + a.valueUsd, 0);
    return {
      label: venue.name,
      icon: <CryptoIcon iconKey={venue.iconKey} label="" size={20} />,
      meta: formatUsd(totalUsd),
      children: slices.map((slice) => ({
        value: `${venueId}-${slice.asset.symbol}`,
        label: slice.asset.symbol,
        icon: <CryptoIcon iconKey={slice.asset.iconKey} label="" size={18} />,
        meta: (
          <>
            {formatUsd(slice.valueUsd)} ·{" "}
            <span className="text-positive">{formatPercent(slice.apy)}</span>
          </>
        ),
      })),
    };
  });
}

export function FundsTree({
  allocations,
}: {
  allocations: RoutedAllocation[];
}) {
  return (
    <BranchedMenu
      label="Index funds by protocol"
      sections={groupByVenue(allocations)}
    />
  );
}
