"use client";

import { Check, Copy, LogOut } from "lucide-react";
import { buttonClassName } from "@/components/ui";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { shortenAddress } from "@/utils/format";
import { useSession } from "../hooks/useSession";

const PILL =
  "flex items-center gap-2 rounded-full bg-surface-raised py-1 pr-3.5 pl-1 text-[0.9rem] font-medium";

function AddressPill({ address }: { address?: string }) {
  const { isCopied, copy } = useCopyToClipboard();
  const Icon = isCopied ? Check : Copy;
  return (
    <button
      type="button"
      disabled={!address}
      onClick={() => address && copy(address)}
      aria-label={isCopied ? "Address copied" : "Copy wallet address"}
      className={`${PILL} transition-colors duration-200 hover:bg-surface-hover disabled:cursor-wait`}
    >
      <span
        aria-hidden
        className="size-7 rounded-full bg-[conic-gradient(from_120deg,var(--brand),var(--positive),var(--accent-strong),var(--brand))]"
      />
      {address ? shortenAddress(address) : "Creating wallet"}
      {address && <Icon aria-hidden className="size-3.5 text-ink-muted" />}
    </button>
  );
}

export function AccountButton() {
  const session = useSession();
  if (!session.isReady)
    return (
      <span
        aria-hidden
        className="h-9 w-36 animate-pulse rounded-full bg-surface-raised"
      />
    );
  if (!session.isAuthenticated)
    return (
      <button
        type="button"
        onClick={session.login}
        className={buttonClassName("primary", "px-4 py-2 text-sm")}
      >
        Log in
      </button>
    );
  return (
    <div className="flex items-center gap-1">
      <AddressPill address={session.address} />
      <button
        type="button"
        onClick={session.logout}
        aria-label="Log out"
        className="rounded-full p-2 text-ink-muted transition-colors duration-200 hover:bg-surface-raised hover:text-ink"
      >
        <LogOut aria-hidden className="size-4" />
      </button>
    </div>
  );
}
