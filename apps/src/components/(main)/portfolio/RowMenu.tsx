"use client";

import { ArrowDownLeft, ArrowUpRight, Eye, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { type SyntheticEvent, useId, useRef } from "react";

const MENU_GAP_PX = 6;

const ITEM =
  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-ink transition-colors duration-150 hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none";

function placeBelow(menu: HTMLElement, trigger: HTMLElement | null) {
  if (!trigger) return;
  const rect = trigger.getBoundingClientRect();
  menu.style.top = `${rect.bottom + MENU_GAP_PX}px`;
  menu.style.left = `${rect.right - menu.offsetWidth}px`;
}

export function RowMenu({
  indexId,
  indexName,
}: {
  indexId: string;
  indexName: string;
}) {
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const href = (action: string) =>
    `/indexes/${indexId}?action=${action}#deposit-panel`;
  const onToggle = (event: SyntheticEvent<HTMLDivElement>) =>
    placeBelow(event.currentTarget, trigger.current);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        popoverTarget={menuId}
        aria-label={`Actions for ${indexName}`}
        className="inline-flex size-8 items-center justify-center rounded-full text-ink-muted transition-colors duration-200 hover:bg-surface-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        <MoreHorizontal aria-hidden className="size-4" />
      </button>
      <div
        id={menuId}
        popover="auto"
        onToggle={onToggle}
        className="m-0 w-44 rounded-lg border border-line bg-surface p-1 text-ink shadow-2xl"
      >
        <Link href={href("deposit")} className={ITEM}>
          <ArrowDownLeft aria-hidden className="size-4 text-ink-muted" />
          Deposit
        </Link>
        <Link href={href("withdraw")} className={ITEM}>
          <ArrowUpRight aria-hidden className="size-4 text-ink-muted" />
          Withdraw
        </Link>
        <Link href={`/indexes/${indexId}`} className={ITEM}>
          <Eye aria-hidden className="size-4 text-ink-muted" />
          View detail
        </Link>
      </div>
    </>
  );
}
