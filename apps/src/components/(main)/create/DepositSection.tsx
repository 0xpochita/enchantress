import { useState } from "react";
import type { BasketDraft } from "@/hooks/useBasketDraft";
import {
  type TokenCatalog,
  TokenSelectModal,
} from "../token-select/TokenSelectModal";
import { DepositField } from "./DepositField";
import { FormSection } from "./FormSection";
import { SubmitBar } from "./SubmitBar";

export function DepositSection({
  draft,
  tokenCatalog,
}: {
  draft: BasketDraft;
  tokenCatalog: TokenCatalog;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const chain = tokenCatalog.chains.find(
    (c) => c.id === draft.depositToken?.chainId,
  );
  return (
    <FormSection title="Deposit from any chain" htmlFor="deposit-amount">
      <DepositField
        id="deposit-amount"
        amount={draft.amount}
        onAmountChange={(amount) => draft.update({ amount })}
        token={draft.depositToken}
        chain={chain}
        onPickToken={() => setIsPickerOpen(true)}
      />
      <SubmitBar
        status={draft.status}
        errors={draft.errors}
        depositUsd={draft.depositUsd}
        onSubmit={draft.submit}
      />
      <TokenSelectModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        catalog={tokenCatalog}
        selectedId={draft.depositTokenId}
        onSelect={(token) => draft.update({ depositTokenId: token.id })}
      />
    </FormSection>
  );
}
