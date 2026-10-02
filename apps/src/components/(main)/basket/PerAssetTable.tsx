import { Card, CryptoIcon } from "@/components/ui";
import type { RoutedAllocation } from "@/types/market";
import { formatPercent, formatSignedPercent, formatUsd } from "@/utils/format";

interface PerAssetTableProps {
  allocations: RoutedAllocation[];
  priceChanges: Record<string, number>;
}

export function PerAssetTable({
  allocations,
  priceChanges,
}: PerAssetTableProps) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="px-6 pt-6 pb-2 text-left text-ink-muted">
          Per asset
        </caption>
        <thead className="text-xs text-ink-subtle">
          <tr>
            <th scope="col" className="px-6 py-2 text-left font-normal">
              Asset
            </th>
            <th scope="col" className="px-3 py-2 text-right font-normal">
              Value
            </th>
            <th scope="col" className="px-3 py-2 text-right font-normal">
              Yield
            </th>
            <th scope="col" className="px-6 py-2 text-right font-normal">
              Price since entry
            </th>
          </tr>
        </thead>
        <tbody>
          {allocations.map(({ asset, venue, valueUsd, apy }) => (
            <tr key={asset.symbol} className="border-t border-line">
              <th scope="row" className="px-6 py-4 text-left font-normal">
                <span className="flex items-center gap-3">
                  <CryptoIcon iconKey={asset.iconKey} label="" size={24} />
                  <span className="font-medium">{asset.symbol}</span>
                  <span className="text-ink-subtle">{venue.name}</span>
                </span>
              </th>
              <td className="px-3 py-4 text-right">{formatUsd(valueUsd)}</td>
              <td className="px-3 py-4 text-right text-positive">
                {formatPercent(apy)}
              </td>
              <td className="px-6 py-4 text-right text-ink-muted">
                {formatSignedPercent(priceChanges[asset.symbol] ?? 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
