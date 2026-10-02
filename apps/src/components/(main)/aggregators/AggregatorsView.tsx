import {
  getAggregator,
  getAggregators,
  getChains,
  getIndexApy,
  getIndexes,
  getTokens,
  getVaultAsset,
  getVenue,
  getVenues,
  POPULAR_TOKEN_IDS,
  WALLET_BALANCES,
} from "@/lib/market";
import type { IndexQuote } from "@/types/market";
import { DepositAggregator } from "./DepositAggregator";
import type { HubProtocol } from "./ProtocolHub";

const DEFAULT_DEPOSIT_TOKEN_ID = "eth-base";

function buildQuotes(): IndexQuote[] {
  return getIndexes().map((index) => ({
    id: index.id,
    name: index.name,
    aggregatorId: index.aggregatorId,
    aggregatorName: getAggregator(index.aggregatorId)?.name ?? "",
    apy: getIndexApy(index),
    assets: index.allocations.flatMap(
      (a) => getVaultAsset(a.assetSymbol) ?? [],
    ),
    venues: [...new Set(index.allocations.map((a) => a.venueId))].flatMap(
      (venueId) => getVenue(venueId) ?? [],
    ),
  }));
}

function buildHubProtocols(): HubProtocol[] {
  return getVenues().map((venue) => ({
    name: venue.name,
    iconKey: venue.iconKey,
    apy: Math.max(0, ...venue.markets.map((m) => m.apy)),
  }));
}

export function AggregatorsView() {
  const catalog = {
    chains: getChains(),
    tokens: getTokens(),
    balances: WALLET_BALANCES,
    popularTokenIds: POPULAR_TOKEN_IDS,
  };
  return (
    <>
      <div className="flex max-w-2xl flex-col gap-2">
        <h1 className="text-3xl font-light tracking-tight">
          Deposit aggregator
        </h1>
        <p className="text-ink-muted">
          Pick any token on any chain. We compare every index across aggregators
          and route your deposit to Monad through Aurora Intents.
        </p>
      </div>
      <DepositAggregator
        catalog={catalog}
        quotes={buildQuotes()}
        protocols={buildHubProtocols()}
        aggregators={getAggregators()}
        defaultTokenId={DEFAULT_DEPOSIT_TOKEN_ID}
      />
    </>
  );
}
