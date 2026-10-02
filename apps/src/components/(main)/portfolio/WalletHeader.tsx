"use client";

import { Check, Copy } from "lucide-react";
import { buttonClassName } from "@/components/ui";
import { useSession } from "@/features/wallet";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { shortenAddress } from "@/utils/format";
import { identiconCells } from "@/utils/identicon";

function Identicon({ address }: { address: string }) {
  return (
    <span
      aria-hidden
      className="grid size-16 flex-none grid-cols-5 overflow-hidden rounded-full bg-surface-raised p-2 ring-1 ring-line"
    >
      {identiconCells(address).map((isOn, cell) => (
        <span
          key={`${cell.toString()}-${isOn}`}
          className={isOn ? "bg-brand" : ""}
        />
      ))}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const { isCopied, copy } = useCopyToClipboard();
  const Icon = isCopied ? Check : Copy;
  return (
    <button
      type="button"
      onClick={() => copy(value)}
      aria-label={isCopied ? "Address copied" : "Copy address"}
      className="rounded-md p-1.5 text-ink-muted transition-colors duration-200 hover:bg-surface-raised hover:text-ink"
    >
      <Icon aria-hidden className="size-4" />
    </button>
  );
}

function SignedOutHeader({ onLogin }: { onLogin: () => void }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-light tracking-tight">Portfolio</h1>
        <p className="text-sm text-ink-muted">
          Log in to see your positions and activity.
        </p>
      </div>
      <button
        type="button"
        onClick={onLogin}
        className={buttonClassName("primary", "px-5 py-2.5 text-sm")}
      >
        Log in
      </button>
    </header>
  );
}

export function WalletHeader() {
  const session = useSession();
  if (!session.address) return <SignedOutHeader onLogin={session.login} />;
  return (
    <header className="flex flex-wrap items-center gap-4">
      <Identicon address={session.address} />
      <h1 className="text-4xl font-light tracking-tight">
        {shortenAddress(session.address)}
      </h1>
      <CopyButton value={session.address} />
    </header>
  );
}
