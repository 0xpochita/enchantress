import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import {
  getAggregator,
  getChains,
  getIndex,
  getIndexApy,
  getTokens,
  POPULAR_TOKEN_IDS,
  routeIndex,
  WALLET_BALANCES,
} from "@/lib/market";
import { RoutingDiagram } from "../routing/RoutingDiagram";
import { DepositPanel } from "./DepositPanel";
import { IndexHeader } from "./IndexHeader";
import { IndexStats } from "./IndexStats";
import { PerAssetTable } from "./PerAssetTable";

const DEFAULT_DEPOSIT_TOKEN_ID = "eth-base";

export function IndexDetailView({ indexId }: { indexId: string }) {
  const index = getIndex(indexId);
  if (!index) notFound();
  const fundsUsd = index.positionUsd > 0 ? index.positionUsd : index.tvlUsd;
  const allocations = routeIndex(index, fundsUsd);
  const apy = getIndexApy(index);
  const priceChanges = Object.fromEntries(
    index.allocations.map((a) => [a.assetSymbol, a.priceChangePct]),
  );
  const catalog = {
    chains: getChains(),
    tokens: getTokens(),
    balances: WALLET_BALANCES,
    popularTokenIds: POPULAR_TOKEN_IDS,
  };

  return (
    <>
      <IndexHeader
        name={index.name}
        assets={allocations.map((a) => a.asset)}
        aggregator={getAggregator(index.aggregatorId)}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="text-sm text-ink-muted">
              {index.positionUsd > 0
                ? "Where your funds are"
                : "Where the index funds are"}
            </h2>
            <RoutingDiagram allocations={allocations} />
          </Card>
          <PerAssetTable
            allocations={allocations}
            priceChanges={priceChanges}
          />
          <IndexStats index={index} apy={apy} />
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
