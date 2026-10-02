import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import {
  getAggregator,
  getBasket,
  getBasketApy,
  getChains,
  getTokens,
  POPULAR_TOKEN_IDS,
  routeBasket,
  WALLET_BALANCES,
} from "@/lib/market";
import { RoutingDiagram } from "../routing/RoutingDiagram";
import { BasketHeader } from "./BasketHeader";
import { BasketStats } from "./BasketStats";
import { DepositPanel } from "./DepositPanel";
import { PerAssetTable } from "./PerAssetTable";

const DEFAULT_DEPOSIT_TOKEN_ID = "eth-base";

export function BasketDetailView({ basketId }: { basketId: string }) {
  const basket = getBasket(basketId);
  if (!basket) notFound();
  const fundsUsd = basket.positionUsd > 0 ? basket.positionUsd : basket.tvlUsd;
  const allocations = routeBasket(basket, fundsUsd);
  const apy = getBasketApy(basket);
  const priceChanges = Object.fromEntries(
    basket.allocations.map((a) => [a.assetSymbol, a.priceChangePct]),
  );
  const catalog = {
    chains: getChains(),
    tokens: getTokens(),
    balances: WALLET_BALANCES,
    popularTokenIds: POPULAR_TOKEN_IDS,
  };

  return (
    <>
      <BasketHeader
        name={basket.name}
        assets={allocations.map((a) => a.asset)}
        aggregator={getAggregator(basket.aggregatorId)}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="text-sm text-ink-muted">
              {basket.positionUsd > 0
                ? "Where your funds are"
                : "Where the basket funds are"}
            </h2>
            <RoutingDiagram allocations={allocations} />
          </Card>
          <PerAssetTable
            allocations={allocations}
            priceChanges={priceChanges}
          />
          <BasketStats basket={basket} apy={apy} />
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <DepositPanel
            apy={apy}
            catalog={catalog}
            defaultTokenId={DEFAULT_DEPOSIT_TOKEN_ID}
          />
        </div>
      </div>
    </>
  );
}
