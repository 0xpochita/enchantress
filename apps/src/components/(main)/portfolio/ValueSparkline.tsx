"use client";

import { motion } from "motion/react";
import { type PointerEvent, useState } from "react";
import { areaPath, linePath, type Point, scaleSeries } from "@/utils/chart";
import { formatDay, formatUsd } from "@/utils/format";
import type { ValuePoint } from "@/utils/portfolio";

const BOX = { width: 300, height: 96, top: 12 };
const PERCENT = 100;

function SparkPaths({ points }: { points: Point[] }) {
  return (
    <svg
      role="img"
      aria-label="Deposits over time"
      viewBox={`0 0 ${BOX.width} ${BOX.height}`}
      preserveAspectRatio="none"
      className="absolute inset-x-0 bottom-0 h-24 w-full"
    >
      <path d={areaPath(points, BOX.height)} className="fill-brand/10" />
      <motion.path
        d={linePath(points)}
        fill="none"
        className="stroke-brand [stroke-width:1.5]"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: [0.65, 0, 0.35, 1] }}
      />
    </svg>
  );
}

function HoverReadout({ point, value }: { point: Point; value: ValuePoint }) {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 w-px bg-line"
        style={{ left: `${(point.x / BOX.width) * PERCENT}%` }}
      />
      <span className="pointer-events-none absolute top-2 left-3 text-xs text-ink-muted tabular-nums">
        {formatUsd(value.valueUsd)} · {formatDay(value.time)}
      </span>
    </>
  );
}

export function ValueSparkline({ series }: { series: ValuePoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const points = scaleSeries(
    series.map((p) => p.valueUsd),
    BOX,
  );
  const track = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    setHovered(
      Math.round(Math.min(1, Math.max(0, ratio)) * (series.length - 1)),
    );
  };
  const point = hovered === null ? undefined : points[hovered];
  const value = hovered === null ? undefined : series[hovered];
  return (
    <div
      className="relative h-28 w-full touch-none overflow-hidden rounded-lg border border-line bg-surface-raised md:w-72"
      onPointerMove={track}
      onPointerLeave={() => setHovered(null)}
    >
      <SparkPaths points={points} />
      {point && value && <HoverReadout point={point} value={value} />}
    </div>
  );
}
