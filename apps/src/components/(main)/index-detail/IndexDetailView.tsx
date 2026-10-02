import { notFound } from "next/navigation";
import {
  getAggregator,
  getChains,
  getIndex,
  getIndexApy,
  getIndexTransactions,
  getTokens,
  POPULAR_TOKEN_IDS,
  routeIndex,
  WALLET_BALANCES,
} from "@/lib/market";
import { DepositPanel } from "./DepositPanel";
import { FundsPanel } from "./FundsPanel";
import { IndexHeader } from "./IndexHeader";
import { IndexStats } from "./IndexStats";
import { TransactionHistory } from "./TransactionHistory";

const DEFAULT_DEPOSIT_TOKEN_ID = "eth-base";

export function IndexDetailView({ indexId }: { indexId: string }) {
  const index = getIndex(indexId);
  if (!index) notFound();
  const fundsUsd = index.positionUsd > 0 ? index.positionUsd : index.tvlUsd;
  const allocations = routeIndex(index, fundsUsd);
  const apy = getIndexApy(index);
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
          <FundsPanel
            key={index.id}
            title={
              index.positionUsd > 0
                ? "Where your funds are"
                : "Where the index funds are"
            }
            allocations={allocations}
            summary={<IndexStats index={index} apy={apy} />}
          />
          <TransactionHistory
            transactions={getIndexTransactions(index.id)}
            indexName={index.name}
            assets={allocations.map((a) => a.asset)}
          />
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
