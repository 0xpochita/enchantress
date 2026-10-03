import { notFound } from "next/navigation";
import { originChainById } from "@/config/chains";
import { getIndexSummary } from "@/features/indexes/services/index-catalog";
import { VAULT_CHAIN_ID } from "@/features/vaults/config/venues";
import type { RoutedAllocation, Venue } from "@/types/market";
import { FundsPanel } from "./FundsPanel";
import { IndexActivity } from "./IndexActivity";
import { IndexHeader } from "./IndexHeader";
import { IndexStats } from "./IndexStats";

function uniqueVenues(allocations: RoutedAllocation[]): Venue[] {
  return [...new Map(allocations.map((a) => [a.venue.id, a.venue])).values()];
}

export async function IndexDetailView({ indexId }: { indexId: string }) {
  const summary = await getIndexSummary(indexId);
  if (!summary) notFound();
  const { index, allocations, apy } = summary;
  const protocols = uniqueVenues(allocations);
  const vaultChain = originChainById(VAULT_CHAIN_ID);
  const chain = vaultChain && {
    id: vaultChain.id,
    name: vaultChain.name,
    iconKey: vaultChain.iconKey,
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
            indexId={index.id}
            indexName={index.name}
            title={
              index.positionUsd > 0
                ? "Where your funds are"
                : "Where the index funds are"
            }
            allocations={allocations}
            summary={<IndexStats index={index} apy={apy} />}
            apy={apy}
            chain={chain}
          />
        </div>
        <div className="min-w-0">
          <IndexActivity indexId={index.id} venues={protocols} />
        </div>
      </div>
    </>
  );
}
