"use client";

import { AnimatePresence, motion } from "motion/react";
import { useDepositRoutes } from "@/hooks/useDepositRoutes";
import type { Aggregator, IndexQuote } from "@/types/market";
import {
  type TokenCatalog,
  TokenSelectModal,
} from "../token-select/TokenSelectModal";
import { DepositForm } from "./DepositForm";
import { type HubProtocol, ProtocolHub } from "./ProtocolHub";
import { RouteList } from "./RouteList";

interface DepositAggregatorProps {
  catalog: TokenCatalog;
  quotes: IndexQuote[];
  protocols: HubProtocol[];
  aggregators: Aggregator[];
  defaultTokenId: string;
}

const PANEL_TRANSITION = { duration: 0.35, ease: [0.22, 1, 0.36, 1] } as const;

export function DepositAggregator({
  catalog,
  quotes,
  protocols,
  aggregators,
  defaultTokenId,
}: DepositAggregatorProps) {
  const deposit = useDepositRoutes({ ...catalog, quotes, defaultTokenId });
  const quotesById = new Map(quotes.map((q) => [q.id, q]));
  const hasAmount = deposit.amountUsd > 0;
  return (
    <div className="grid items-stretch gap-6 lg:grid-cols-2">
      <DepositForm
        deposit={deposit}
        quote={
          hasAmount
            ? deposit.selected && quotesById.get(deposit.selected.indexId)
            : undefined
        }
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={hasAmount ? "routes" : "hub"}
          className="h-full"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={PANEL_TRANSITION}
        >
          {hasAmount ? (
            <RouteList
              deposit={deposit}
              quotesById={quotesById}
              aggregators={aggregators}
            />
          ) : (
            <ProtocolHub protocols={protocols} />
          )}
        </motion.div>
      </AnimatePresence>
      <TokenSelectModal
        isOpen={deposit.isPickerOpen}
        onClose={deposit.closePicker}
        catalog={catalog}
        selectedId={deposit.tokenId}
        onSelect={(token) => deposit.setTokenId(token.id)}
      />
    </div>
  );
}
