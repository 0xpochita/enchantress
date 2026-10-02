import type { ReactNode } from "react";

interface StatProps {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "positive";
}

export function Stat({ label, value, hint, tone = "default" }: StatProps) {
  const valueTone = tone === "positive" ? "text-positive" : "text-ink";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className={`text-2xl font-semibold ${valueTone}`}>{value}</span>
      {hint && <span className="text-xs text-ink-subtle">{hint}</span>}
    </div>
  );
}
