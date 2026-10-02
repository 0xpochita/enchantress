import {
  getAggregator,
  getAggregators,
  getBasketApy,
  getBaskets,
  getChains,
  getTokens,
  getVaultAsset,
  POPULAR_TOKEN_IDS,
  WALLET_BALANCES,
} from "@/lib/market";
import type { BasketQuote } from "@/types/market";
import { DepositAggregator } from "./DepositAggregator";

const DEFAULT_DEPOSIT_TOKEN_ID = "eth-base";

function buildQuotes(): BasketQuote[] {
  return getBaskets().map((basket) => ({
    id: basket.id,
    name: basket.name,
    aggregatorId: basket.aggregatorId,
    aggregatorName: getAggregator(basket.aggregatorId)?.name ?? "",
    apy: getBasketApy(basket),
    assets: basket.allocations.flatMap(
      (a) => getVaultAsset(a.assetSymbol) ?? [],
    ),
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
        <h1 className="text-3xl font-bold tracking-tight">
          Deposit aggregator
        </h1>
        <p className="text-ink-muted">
          Pick any token on any chain. We compare every basket across
          aggregators and route your deposit to Monad through Aurora Intents.
        </p>
      </div>
      <DepositAggregator
        catalog={catalog}
        quotes={buildQuotes()}
        aggregators={getAggregators()}
        defaultTokenId={DEFAULT_DEPOSIT_TOKEN_ID}
      />
    </>
  );
}
