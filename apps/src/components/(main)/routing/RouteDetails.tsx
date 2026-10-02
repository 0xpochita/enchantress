import Image from "next/image";
import type { Chain } from "@/types/market";
import { formatUsd } from "@/utils/format";
import { estimateRouteFeeUsd } from "@/utils/routes";

const VAULT_CHAIN_ID = "monad";

interface RouteDetailsProps {
  chain?: Chain;
  sliceCount: number;
}

export function RouteDetails({ chain, sliceCount }: RouteDetailsProps) {
  const isCrossChain = chain?.id !== VAULT_CHAIN_ID;
  return (
    <dl className="flex flex-col gap-2 border-t border-line px-1 pt-4 text-xs">
      <div className="flex items-center justify-between gap-3">
        <dt className="text-ink-muted">Route</dt>
        <dd className="flex items-center gap-1.5 text-right">
          {isCrossChain ? (
            <>
              {chain?.name} to Monad via
              <Image
                src="/logo/aurora-logo.avif"
                alt=""
                width={14}
                height={15}
                className="rounded-sm"
              />
              Aurora Intents
            </>
          ) : (
            "Already on Monad"
          )}
        </dd>
      </div>
      <div className="flex items-center justify-between gap-3">
        <dt className="text-ink-muted">Est. fee</dt>
        <dd>~{formatUsd(estimateRouteFeeUsd(isCrossChain, sliceCount))}</dd>
      </div>
    </dl>
  );
}
