import { notFound } from "next/navigation";
import {
  DEFAULT_DEPOSIT_TOKEN_ID,
  getChains,
  getIndex,
  getIndexApy,
  getIndexTransactions,
  getTokens,
  POPULAR_TOKEN_IDS,
  routeIndex,
  WALLET_BALANCES,
} from "@/lib/market";
import type { RoutedAllocation, Venue } from "@/types/market";
import { FundsPanel } from "./FundsPanel";
import { IndexHeader } from "./IndexHeader";
import { IndexStats } from "./IndexStats";
import { TransactionHistory } from "./TransactionHistory";

function uniqueVenues(allocations: RoutedAllocation[]): Venue[] {
  return [...new Map(allocations.map((a) => [a.venue.id, a.venue])).values()];
}

export function IndexDetailView({ indexId }: { indexId: string }) {
  const index = getIndex(indexId);
  if (!index) notFound();
  const fundsUsd = index.positionUsd > 0 ? index.positionUsd : index.tvlUsd;
  const allocations = routeIndex(index, fundsUsd);
  const apy = getIndexApy(index);
  const protocols = uniqueVenues(allocations);
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
        protocols={protocols}
      />
      <div className="flex flex-col gap-6">
        <div className="min-w-0">
          <FundsPanel
            key={index.id}
            title={
              index.positionUsd > 0
                ? "Where your funds are"
                : "Where the index funds are"
            }
            allocations={allocations}
            summary={<IndexStats index={index} apy={apy} />}
            apy={apy}
            catalog={catalog}
            defaultTokenId={DEFAULT_DEPOSIT_TOKEN_ID}
          />
        </div>
        <div className="min-w-0">
          <TransactionHistory
            transactions={getIndexTransactions(index.id)}
            indexName={index.name}
            protocols={protocols}
          />
        </div>
      </div>
    </>
  );
}
