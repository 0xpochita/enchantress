"use client";

import { motion } from "motion/react";
import { BRAND_FADE_SURFACE, CryptoIcon, LogoMark } from "@/components/ui";
import { formatPercent } from "@/utils/format";
import { arcPosition } from "@/utils/orbit";

export interface HubProtocol {
  name: string;
  iconKey: string;
  apy: number;
}

const HEIGHT_TO_WIDTH = 0.5;
const ARC_DIAMETERS = ["100%", "72%", "44%"];
const SLOTS = [
  { radius: 0.43, angle: 160, size: 36 },
  { radius: 0.3, angle: 122, size: 44 },
  { radius: 0.44, angle: 76, size: 40 },
  { radius: 0.3, angle: 52, size: 36 },
  { radius: 0.45, angle: 24, size: 44 },
];
const POP_DELAY_S = 0.25;
const POP_STAGGER_S = 0.09;
const FLOAT_BASE_S = 3.2;

function HubArcs() {
  return ARC_DIAMETERS.map((diameter, position) => (
    <motion.div
      key={diameter}
      aria-hidden
      className="-translate-x-1/2 absolute bottom-0 left-1/2 aspect-square translate-y-1/2 rounded-full bg-linear-to-b from-surface-raised to-surface shadow-[0_-10px_30px_-18px_rgb(0_0_0/0.18)] ring-1 ring-line"
      style={{ width: diameter }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.6,
        delay: position * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
    />
  ));
}

function HubNodes({ protocols }: { protocols: HubProtocol[] }) {
  return protocols.slice(0, SLOTS.length).map((protocol, position) => {
    const slot = SLOTS[position];
    const point = arcPosition(slot.radius, slot.angle, HEIGHT_TO_WIDTH);
    return (
      <motion.span
        key={protocol.name}
        title={`${protocol.name} · up to ${formatPercent(protocol.apy)} APY`}
        className="-translate-x-1/2 -translate-y-1/2 absolute flex drop-shadow-md"
        style={{ left: `${point.leftPct}%`, top: `${point.topPct}%` }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
        transition={{
          opacity: { delay: POP_DELAY_S + position * POP_STAGGER_S },
          scale: {
            delay: POP_DELAY_S + position * POP_STAGGER_S,
            type: "spring",
            stiffness: 260,
            damping: 16,
          },
          y: {
            delay: 1,
            duration: FLOAT_BASE_S + position * 0.4,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          },
        }}
      >
        <CryptoIcon
          iconKey={protocol.iconKey}
          label={protocol.name}
          size={slot.size}
        />
      </motion.span>
    );
  });
}

export function ProtocolHub({ protocols }: { protocols: HubProtocol[] }) {
  const bestApy = Math.max(0, ...protocols.map((p) => p.apy));
  return (
    <section
      aria-label="Integrated protocols"
      className={`flex h-full flex-col items-center gap-2 overflow-hidden rounded-lg border border-line px-6 pt-8 text-center ${BRAND_FADE_SURFACE}`}
    >
      <h2 className="text-2xl font-light tracking-tight">
        Every deposit finds its best vault.
      </h2>
      <p className="text-sm text-ink-muted">
        {protocols.length} protocols on Monad · up to{" "}
        <span className="text-brand">{formatPercent(bestApy)} APY</span>
      </p>
      <div className="relative mt-auto aspect-[2/1] w-full max-w-lg">
        <HubArcs />
        <HubNodes protocols={protocols} />
        <motion.div
          className="-translate-x-1/2 -translate-y-1/2 absolute top-[82%] left-1/2 flex size-20 items-center justify-center overflow-hidden rounded-full bg-ink-subtle/45"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 16 }}
        >
          <span
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(var(--canvas)_1.2px,transparent_1.4px)] bg-size-[5px_5px] opacity-80"
          />
          <LogoMark
            tone="light"
            className="relative size-9 object-contain dark:hidden"
          />
          <LogoMark
            tone="dark"
            className="relative hidden size-9 object-contain dark:block"
          />
        </motion.div>
      </div>
    </section>
  );
}
