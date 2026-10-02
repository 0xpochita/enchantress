import { Card, CryptoIcon } from "@/components/ui";
import type { Venue } from "@/types/market";
import { formatPercent } from "@/utils/format";

export function VenueTable({ venues }: { venues: Venue[] }) {
  return (
    <Card>
      <h2 className="px-6 pt-6 pb-2 text-sm text-ink-muted">Vaults on Monad</h2>
      <ul>
        {venues.map((venue) => (
          <li
            key={venue.id}
            className="flex flex-wrap items-center gap-4 border-t border-line px-6 py-4"
          >
            <span className="flex w-40 items-center gap-3 font-medium">
              <CryptoIcon iconKey={venue.iconKey} label="" size={28} />
              {venue.name}
            </span>
            <ul
              aria-label={`${venue.name} markets`}
              className="flex flex-wrap gap-2"
            >
              {venue.markets.map((market) => (
                <li
                  key={market.assetSymbol}
                  className="rounded-full bg-surface-raised px-3 py-1 text-sm"
                >
                  {market.assetSymbol}{" "}
                  <span className="text-positive">
                    {formatPercent(market.apy)}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Card>
  );
}
