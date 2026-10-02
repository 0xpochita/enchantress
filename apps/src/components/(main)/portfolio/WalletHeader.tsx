"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { shortenAddress } from "@/utils/format";
import { identiconCells } from "@/utils/identicon";

const COPIED_MS = 1500;

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
  const [isCopied, setIsCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), COPIED_MS);
  };
  const Icon = isCopied ? Check : Copy;
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={isCopied ? "Address copied" : "Copy address"}
      className="rounded-md p-1.5 text-ink-muted transition-colors duration-200 hover:bg-surface-raised hover:text-ink"
    >
      <Icon aria-hidden className="size-4" />
    </button>
  );
}

export function WalletHeader({ address }: { address: string }) {
  return (
    <header className="flex flex-wrap items-center gap-4">
      <Identicon address={address} />
      <h1 className="text-4xl font-light tracking-tight">
        {shortenAddress(address)}
      </h1>
      <CopyButton value={address} />
    </header>
  );
}
