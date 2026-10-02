"use client";

import { useDepositRoutes } from "@/hooks/useDepositRoutes";
import type { Aggregator, BasketQuote } from "@/types/market";
import {
  type TokenCatalog,
  TokenSelectModal,
} from "../token-select/TokenSelectModal";
import { DepositForm } from "./DepositForm";
import { RouteList } from "./RouteList";

interface DepositAggregatorProps {
  catalog: TokenCatalog;
  quotes: BasketQuote[];
  aggregators: Aggregator[];
  defaultTokenId: string;
}

export function DepositAggregator({
  catalog,
  quotes,
  aggregators,
  defaultTokenId,
}: DepositAggregatorProps) {
  const deposit = useDepositRoutes({ ...catalog, quotes, defaultTokenId });
  const quotesById = new Map(quotes.map((q) => [q.id, q]));
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <DepositForm
        deposit={deposit}
        quote={deposit.selected && quotesById.get(deposit.selected.basketId)}
      />
      <RouteList
        deposit={deposit}
        quotesById={quotesById}
        aggregators={aggregators}
      />
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
