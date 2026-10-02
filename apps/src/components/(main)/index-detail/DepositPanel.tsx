"use client";

import { buttonClassName, Card, SegmentedControl } from "@/components/ui";
import { DEPOSIT_ACTIONS, useDepositAction } from "@/hooks/useDepositAction";
import { formatPercent, formatUsd } from "@/utils/format";
import { yearlyRewardsUsd } from "@/utils/yield-index";
import { DepositField } from "../create/DepositField";
import {
  type TokenCatalog,
  TokenSelectModal,
} from "../token-select/TokenSelectModal";

interface DepositPanelProps {
  apy: number;
  catalog: TokenCatalog;
  defaultTokenId: string;
}

export function DepositPanel({
  apy,
  catalog,
  defaultTokenId,
}: DepositPanelProps) {
  const panel = useDepositAction({ ...catalog, defaultTokenId });
  return (
    <Card className="flex flex-col">
      <div
        id="deposit-panel"
        className="m-4 rounded-full border border-line p-1"
      >
        <SegmentedControl
          label="Action"
          options={DEPOSIT_ACTIONS}
          value={panel.action}
          onChange={panel.setAction}
        />
      </div>
      <div className="flex flex-col gap-2 border-y border-line p-6">
        <label htmlFor="panel-amount" className="text-sm text-ink-muted">
          {panel.action === "Deposit" ? "Amount in" : "Amount out"}
        </label>
        <DepositField
          id="panel-amount"
          amount={panel.amount}
          onAmountChange={panel.setAmount}
          token={panel.token}
          chain={panel.chain}
          onPickToken={panel.openPicker}
        />
        <p className="text-xs text-ink-subtle">
          about {formatUsd(yearlyRewardsUsd(panel.valueUsd, apy))} / year at{" "}
          {formatPercent(apy)}
        </p>
      </div>
      <div className="flex flex-col gap-3 p-6">
        <button
          type="button"
          disabled={panel.valueUsd <= 0}
          onClick={panel.submit}
          className={buttonClassName("primary", "w-full py-3")}
        >
          {panel.action} {formatUsd(panel.valueUsd)}
        </button>
        {panel.statusMessage && (
          <output className="text-sm text-positive">
            {panel.statusMessage}
          </output>
        )}
      </div>
      <TokenSelectModal
        isOpen={panel.isPickerOpen}
        onClose={panel.closePicker}
        catalog={catalog}
        selectedId={panel.tokenId}
        onSelect={(token) => panel.setTokenId(token.id)}
      />
    </Card>
  );
}
