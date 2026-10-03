"use client";

import { type ReactNode, useRef } from "react";

function glowVars(el: HTMLElement, clientX: number, clientY: number) {
  const rect = el.getBoundingClientRect();
  const x = clientX - rect.left - rect.width / 2;
  const y = clientY - rect.top - rect.height / 2;
  const angle = (Math.atan2(y, x) * 180) / Math.PI + 90;
  const edge = Math.max(
    Math.abs(x) / (rect.width / 2),
    Math.abs(y) / (rect.height / 2),
  );
  el.style.setProperty("--glow-angle", `${angle}deg`);
  el.style.setProperty("--glow-edge", Math.min(1, edge).toFixed(3));
}

export function GlowCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={`glow-card ${className}`}
      onPointerMove={(e) =>
        ref.current && glowVars(ref.current, e.clientX, e.clientY)
      }
      onPointerLeave={() => ref.current?.style.setProperty("--glow-edge", "0")}
    >
      {children}
    </div>
  );
}
