"use client";

import { LayoutGrid } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { TokenStack } from "./TokenStack";

export interface TagItem {
  id: string;
  label: string;
  count: number;
  icons: { iconKey: string; label: string }[];
  href?: string;
}

interface TagBarProps {
  label: string;
  items: TagItem[];
  activeId: string;
  layoutId: string;
  onSelect?: (id: string) => void;
  wrap?: boolean;
}

const BAR = "flex max-w-full gap-1 border border-line bg-surface p-1";
const BAR_LAYOUT = {
  scroll: "w-fit overflow-x-auto rounded-full [scrollbar-width:none]",
  wrap: "flex-wrap rounded-3xl",
};

const TAG =
  "relative flex flex-none items-center gap-2 rounded-full py-1.5 pr-3 pl-1.5 text-sm text-ink-muted transition-colors duration-200 hover:text-ink aria-[current=true]:text-ink";

function TagContent({
  item,
  isActive,
  layoutId,
}: {
  item: TagItem;
  isActive: boolean;
  layoutId: string;
}) {
  return (
    <>
      {isActive && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-full bg-surface-raised ring-1 ring-line"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      )}
      <span className="relative flex">
        {item.icons.length > 0 ? (
          <TokenStack items={item.icons} size={22} />
        ) : (
          <span className="flex size-[22px] items-center justify-center rounded-full bg-surface-hover">
            <LayoutGrid aria-hidden className="size-3" />
          </span>
        )}
      </span>
      <span className="relative whitespace-nowrap">{item.label}</span>
      <span className="relative rounded-full bg-surface px-1.5 text-xs text-ink-subtle tabular-nums">
        {item.count}
      </span>
    </>
  );
}

function Tag({
  item,
  isActive,
  layoutId,
  onSelect,
}: {
  item: TagItem;
  isActive: boolean;
  layoutId: string;
  onSelect?: (id: string) => void;
}): ReactNode {
  const content = (
    <TagContent item={item} isActive={isActive} layoutId={layoutId} />
  );
  if (item.href)
    return (
      <Link
        href={item.href}
        scroll={false}
        aria-current={isActive}
        className={TAG}
      >
        {content}
      </Link>
    );
  return (
    <button
      type="button"
      aria-current={isActive}
      onClick={() => onSelect?.(item.id)}
      className={TAG}
    >
      {content}
    </button>
  );
}

export function TagBar({
  label,
  items,
  activeId,
  layoutId,
  onSelect,
  wrap = false,
}: TagBarProps) {
  return (
    <nav
      aria-label={label}
      className={`${BAR} ${wrap ? BAR_LAYOUT.wrap : BAR_LAYOUT.scroll}`}
    >
      {items.map((item) => (
        <Tag
          key={item.id}
          item={item}
          isActive={item.id === activeId}
          layoutId={layoutId}
          onSelect={onSelect}
        />
      ))}
    </nav>
  );
}
