import { Wallet, Zap } from "lucide-react";
import type { RoutedAllocation } from "@/types/market";
import { formatPercent, formatUsd } from "@/utils/format";
import { RouteNode } from "./RouteNode";

export interface RoutingSource {
  symbol: string;
  chainName: string;
  iconKey: string;
  chainIconKey: string;
  isCrossChain: boolean;
}

interface RoutingDiagramProps {
  source?: RoutingSource;
  allocations: RoutedAllocation[];
}

const CONNECTOR = "h-px w-6 shrink-0 bg-line";
const BRANCH =
  "relative flex items-center py-1.5 pl-6 before:absolute before:top-1/2 before:left-0 before:h-px before:w-6 before:bg-line after:absolute after:top-0 after:bottom-0 after:left-0 after:w-px after:bg-line last:after:bottom-1/2";

function SourceNodes({ source }: { source?: RoutingSource }) {
  if (!source)
    return (
      <RouteNode
        icon={<Wallet aria-hidden className="size-5" />}
        title="Wallet"
      />
    );
  return (
    <>
      <RouteNode
        iconKey={source.iconKey}
        badgeIconKey={source.chainIconKey}
        title={source.symbol}
        detail={`Wallet on ${source.chainName}`}
      />
      {source.isCrossChain && (
        <>
          <span aria-hidden className={CONNECTOR} />
          <RouteNode
            icon={<Zap aria-hidden className="size-5 text-brand" />}
            title="Aurora Intents"
            detail="to Monad"
          />
        </>
      )}
    </>
  );
}

export function RoutingDiagram({ source, allocations }: RoutingDiagramProps) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex w-max flex-col">
        <div className="flex items-center">
          <SourceNodes source={source} />
        </div>
        <ul aria-label="Allocations" className="ml-6 pt-2">
          {allocations.map((allocation) => (
            <li key={allocation.asset.symbol} className={BRANCH}>
              <RouteNode
                iconKey={allocation.asset.iconKey}
                title={allocation.asset.symbol}
                detail={formatUsd(allocation.valueUsd)}
              />
              <span aria-hidden className={CONNECTOR} />
              <RouteNode
                iconKey={allocation.venue.iconKey}
                title={allocation.venue.name}
                detail={
                  <span className="text-positive">
                    {formatPercent(allocation.apy)}
                  </span>
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
