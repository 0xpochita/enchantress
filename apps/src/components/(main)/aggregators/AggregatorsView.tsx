import {
  getBridgeSource,
  MONAD_USDC_ASSET_ID,
} from "@/features/bridge/services/bridge-catalog";
import { getIndexSummaries } from "@/features/indexes/services/index-catalog";
import type { IndexSummary } from "@/features/indexes/utils/route-index";
import { getVenueSnapshot } from "@/features/vaults/services/venue-snapshot";
import type { IndexQuote, Venue } from "@/types/market";
import { DepositAggregator } from "./DepositAggregator";
import type { HubProtocol } from "./ProtocolHub";

function toQuote({ index, allocations, apy }: IndexSummary): IndexQuote {
  const venues = new Map(allocations.map((a) => [a.venue.id, a.venue]));
  return {
    id: index.id,
    name: index.name,
    apy,
    assets: allocations.map((a) => ({
      symbol: a.asset.symbol,
      iconKey: a.asset.iconKey,
    })),
    venues: [...venues.values()].map((v) => ({
      id: v.id,
      name: v.name,
      iconKey: v.iconKey,
    })),
    allocations,
  };
}

function toHubProtocol(venue: Venue): HubProtocol {
  return {
    name: venue.name,
    iconKey: venue.iconKey,
    apy: Math.max(0, ...venue.markets.map((m) => m.apy)),
  };
}

export async function AggregatorsView() {
  const [{ venues }, summaries, source] = await Promise.all([
    getVenueSnapshot(),
    getIndexSummaries(),
    getBridgeSource(),
  ]);
  return (
    <>
      <div className="flex max-w-2xl flex-col gap-2">
        <h1 className="text-3xl font-light tracking-tight">
          Deposit aggregator
        </h1>
        <p className="text-ink-muted">
          Pick any token on any chain. We compare every index across protocols
          and route your deposit to Monad through Aurora Intents.
        </p>
      </div>
      <DepositAggregator
        catalog={source.catalog}
        quotes={summaries.filter((s) => s.index.isFeatured).map(toQuote)}
        protocols={venues.map(toHubProtocol)}
        venues={venues}
        defaultTokenId={MONAD_USDC_ASSET_ID}
      />
    </>
  );
}
