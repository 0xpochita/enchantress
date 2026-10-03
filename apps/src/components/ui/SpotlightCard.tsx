"use client";

import { type ReactNode, useRef, useState } from "react";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
}

export function SpotlightCard({
  children,
  className = "",
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const [lit, setLit] = useState(false);
  const track = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect)
      setPoint({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  };
  return (
    <div
      ref={ref}
      onPointerMove={track}
      onPointerEnter={() => setLit(true)}
      onPointerLeave={() => setLit(false)}
      className={`spotlight-card ${className}`}
    >
      <div
        aria-hidden
        className="spotlight-glow"
        style={{
          opacity: lit ? 1 : 0,
          background: `radial-gradient(circle at ${point.x}px ${point.y}px, var(--spotlight), transparent 70%)`,
        }}
      />
      {children}
    </div>
  );
}
