"use client";

import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useState } from "react";

const TABS = ["Positions", "Activity"] as const;
type Tab = (typeof TABS)[number];

function TabList({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  return (
    <div role="tablist" className="flex gap-6 border-b border-line">
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={tab === active}
          onClick={() => onChange(tab)}
          className="relative pb-3 text-ink-muted transition-colors duration-200 hover:text-ink aria-selected:text-ink"
        >
          {tab}
          {tab === active && (
            <motion.span
              layoutId="portfolio-tab"
              className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}

export function PortfolioTabs({ panels }: { panels: Record<Tab, ReactNode> }) {
  const [active, setActive] = useState<Tab>("Positions");
  return (
    <div className="flex flex-col gap-8">
      <TabList active={active} onChange={setActive} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          role="tabpanel"
          className="flex flex-col gap-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {panels[active]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
