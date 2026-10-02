import Image from "next/image";
import { buttonClassName, SegmentedControl } from "@/components/ui";
import {
  DEPOSIT_ACTIONS,
  type useDepositAction,
} from "@/hooks/useDepositAction";
import { formatPercent, formatUsd } from "@/utils/format";
import { estimateRouteFeeUsd } from "@/utils/routes";
import { yearlyRewardsUsd } from "@/utils/yield-index";
import { TokenButton } from "../token-select/TokenButton";

interface DepositBarProps {
  panel: ReturnType<typeof useDepositAction>;
  apy: number;
  sliceCount: number;
}

const VAULT_CHAIN_ID = "monad";

function RouteDetails({ panel, sliceCount }: Omit<DepositBarProps, "apy">) {
  const isCrossChain = panel.chain?.id !== VAULT_CHAIN_ID;
  return (
    <dl className="flex flex-col gap-2 border-t border-line px-1 pt-4 text-xs">
      <div className="flex items-center justify-between gap-3">
        <dt className="text-ink-muted">Route</dt>
        <dd className="flex items-center gap-1.5 text-right">
          {isCrossChain ? (
            <>
              {panel.chain?.name} to Monad via
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

export function DepositBar({ panel, apy, sliceCount }: DepositBarProps) {
  const isDeposit = panel.action === "Deposit";
  return (
    <div
      id="deposit-panel"
      className="flex min-h-[22rem] scroll-mt-28 flex-col gap-5 rounded-md bg-surface-raised p-5"
    >
      <div className="rounded-full bg-surface p-0.5">
        <SegmentedControl
          label="Action"
          options={DEPOSIT_ACTIONS}
          value={panel.action}
          onChange={panel.setAction}
        />
      </div>
      <div className="flex flex-col gap-2 px-1">
        <label htmlFor="index-amount" className="text-xs text-ink-muted">
          {isDeposit ? "You deposit" : "You withdraw"}
        </label>
        <div className="flex min-w-0 items-center gap-3">
          <input
            id="index-amount"
            inputMode="decimal"
            placeholder="0.00"
            value={panel.amount}
            onChange={(event) =>
              panel.setAmount(event.target.value.replace(/[^0-9.]/g, ""))
            }
            className="w-full min-w-0 bg-transparent text-3xl font-light outline-none placeholder:text-ink-subtle"
          />
          <TokenButton
            token={panel.token}
            chain={panel.chain}
            onClick={panel.openPicker}
          />
        </div>
      </div>
      <span className="px-1 text-xs text-ink-muted">
        ≈ {formatUsd(yearlyRewardsUsd(panel.valueUsd, apy))}/yr at{" "}
        {formatPercent(apy)}
      </span>
      <div className="mt-auto flex flex-col gap-4">
        <RouteDetails panel={panel} sliceCount={sliceCount} />
        <button
          type="button"
          disabled={panel.valueUsd <= 0}
          onClick={panel.submit}
          className={buttonClassName("primary", "w-full py-3 text-sm")}
        >
          {panel.action} {formatUsd(panel.valueUsd)}
        </button>
      </div>
    </div>
  );
}
