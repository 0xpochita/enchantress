"use client";

import { motion } from "motion/react";
import type { CSSProperties } from "react";
import { BRAND_FADE_SURFACE, CryptoIcon, LogoMark } from "@/components/ui";
import { formatPercent } from "@/utils/format";

export interface HubProtocol {
  name: string;
  iconKey: string;
  apy: number;
}

const ARC_DIAMETERS = ["100%", "72%", "44%"];
const ORBITS = [
  { diameter: "100%", durationS: 36, direction: 1, size: 56 },
  { diameter: "72%", durationS: 26, direction: -1, size: 46 },
];
const POP_DELAY_S = 0.25;
const POP_STAGGER_S = 0.09;

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

const SPIN =
  "animate-[orbit_var(--orbit-duration)_linear_infinite] motion-reduce:animate-none";

function spinStyle(fromDeg: number, turnDeg: number, durationS: number) {
  return {
    "--orbit-from": `${fromDeg}deg`,
    "--orbit-turn": `${turnDeg}deg`,
    "--orbit-duration": `${durationS}s`,
  } as CSSProperties;
}

interface OrbitNodeProps {
  protocol: HubProtocol;
  orbit: (typeof ORBITS)[number];
  startDeg: number;
  delayS: number;
}

function OrbitNode({ protocol, orbit, startDeg, delayS }: OrbitNodeProps) {
  const turn = 360 * orbit.direction;
  return (
    <div
      className="-translate-x-1/2 pointer-events-none absolute bottom-0 left-1/2 aspect-square translate-y-1/2"
      style={{ width: orbit.diameter }}
    >
      <div
        className={`absolute inset-0 ${SPIN}`}
        style={spinStyle(startDeg, turn, orbit.durationS)}
      >
        <motion.span
          title={`${protocol.name} · up to ${formatPercent(protocol.apy)} APY`}
          className="-translate-x-1/2 -translate-y-1/2 pointer-events-auto absolute top-0 left-1/2 flex drop-shadow-md"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: delayS,
            type: "spring",
            stiffness: 260,
            damping: 16,
          }}
        >
          <span
            className={`flex ${SPIN}`}
            style={spinStyle(-startDeg, -turn, orbit.durationS)}
          >
            <CryptoIcon
              iconKey={protocol.iconKey}
              label={protocol.name}
              size={orbit.size}
            />
          </span>
        </motion.span>
      </div>
    </div>
  );
}

function HubNodes({ protocols }: { protocols: HubProtocol[] }) {
  const step = 360 / Math.max(1, protocols.length);
  return ORBITS.flatMap((orbit, ring) =>
    protocols.map((protocol, slot) => (
      <OrbitNode
        key={`${orbit.diameter}-${protocol.name}`}
        protocol={protocol}
        orbit={orbit}
        startDeg={slot * step + ring * (step / 2)}
        delayS={POP_DELAY_S + slot * POP_STAGGER_S}
      />
    )),
  );
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
      <div className="relative mt-auto aspect-[2/1] w-[130%] max-w-none flex-none">
        <HubArcs />
        <HubNodes protocols={protocols} />
        <motion.div
          className="-translate-x-1/2 -translate-y-1/2 absolute top-[84%] left-1/2 flex size-28 items-center justify-center overflow-hidden rounded-full bg-ink-subtle/45"
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
            className="relative size-12 object-contain dark:hidden"
          />
          <LogoMark
            tone="dark"
            className="relative hidden size-12 object-contain dark:block"
          />
        </motion.div>
      </div>
    </section>
  );
}
