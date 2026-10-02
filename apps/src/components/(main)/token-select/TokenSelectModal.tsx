"use client";

import { X } from "lucide-react";
import { useMemo } from "react";
import { Modal } from "@/components/ui";
import { useTokenSearch } from "@/hooks/useTokenSearch";
import type { Chain, Token, WalletBalance } from "@/types/market";
import { ChainList } from "./ChainList";
import { PopularTokens } from "./PopularTokens";
import { SearchInput } from "./SearchInput";
import { TokenSections } from "./TokenSections";

export interface TokenCatalog {
  chains: Chain[];
  tokens: Token[];
  balances: WalletBalance[];
  popularTokenIds: string[];
}

interface TokenSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: TokenCatalog;
  selectedId?: string;
  onSelect: (token: Token) => void;
}

export function TokenSelectModal({
  isOpen,
  onClose,
  catalog,
  selectedId,
  onSelect,
}: TokenSelectModalProps) {
  const search = useTokenSearch(catalog);
  const chainsById = useMemo(
    () => new Map(catalog.chains.map((c) => [c.id, c])),
    [catalog.chains],
  );
  const popular = catalog.tokens.filter((t) =>
    catalog.popularTokenIds.includes(t.id),
  );
  const pick = (token: Token) => {
    onSelect(token);
    onClose();
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} label="Select a token">
      <div className="grid h-[min(40rem,85vh)] grid-rows-[auto_1fr] md:grid-cols-[16rem_1fr] md:grid-rows-1">
        <div className="flex min-h-0 flex-col gap-3 border-line p-4 max-md:max-h-48 max-md:border-b md:border-r">
          <SearchInput
            label="Search chain"
            value={search.chainQuery}
            onChange={search.setChainQuery}
          />
          <div className="min-h-0 overflow-y-auto">
            <ChainList
              chains={search.visibleChains}
              activeId={search.chainId}
              onSelect={search.setChainId}
            />
          </div>
        </div>
        <div className="flex min-h-0 flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchInput
                label="Search token"
                value={search.tokenQuery}
                onChange={search.setTokenQuery}
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-2 hover:bg-surface-raised"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <PopularTokens
            tokens={popular}
            chainsById={chainsById}
            onSelect={pick}
          />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <TokenSections
              search={search}
              chainsById={chainsById}
              selectedId={selectedId}
              onSelect={pick}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
