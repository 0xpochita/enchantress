"use client";

import { useEffect, useState } from "react";

const TICK_MS = 1000;
const SECONDS_PER_MINUTE = 60;

function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / TICK_MS));
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const rest = String(seconds % SECONDS_PER_MINUTE).padStart(2, "0");
  return `${minutes}:${rest}`;
}

export function ElapsedTime({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return (
    <span className="tabular-nums">
      {formatElapsed(now - new Date(since).getTime())}
    </span>
  );
}
