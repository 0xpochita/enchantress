import { notFound } from "next/navigation";
import {
  DEFAULT_DEPOSIT_TOKEN_ID,
  getChains,
  getIndexSummary,
  getIndexTransactions,
  getTokens,
  POPULAR_TOKEN_IDS,
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

export async function IndexDetailView({ indexId }: { indexId: string }) {
  const summary = await getIndexSummary(indexId);
  if (!summary) notFound();
  const { index, allocations, apy } = summary;
  const protocols = uniqueVenues(allocations);
  const transactions = await getIndexTransactions(index.id);
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
            indexName={index.name}
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
            transactions={transactions}
            indexes={{ [index.id]: { name: index.name, protocols } }}
          />
        </div>
      </div>
    </>
  );
}
