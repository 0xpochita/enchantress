import { motion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClassName } from "@/components/ui";

const DRAW = { duration: 0.45, ease: [0.65, 0, 0.35, 1] } as const;
const MARK_PATHS = {
  success: ["M16 25l6 6 11-13"],
  failed: ["M18 18l12 12", "M30 18L18 30"],
};

export type ResultTone = keyof typeof MARK_PATHS;

function StatusMark({ tone }: { tone: ResultTone }) {
  const color = tone === "success" ? "text-positive" : "text-negative";
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 48 48"
      className={`size-16 ${color}`}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
    >
      <circle cx="24" cy="24" r="22" className="fill-current opacity-15" />
      {MARK_PATHS[tone].map((d, position) => (
        <motion.path
          key={d}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ ...DRAW, delay: 0.2 + position * 0.15 }}
        />
      ))}
    </motion.svg>
  );
}

interface ResultStepProps {
  tone: ResultTone;
  title: string;
  message: ReactNode;
  actions: ReactNode;
}

export function ResultStep({ tone, title, message, actions }: ResultStepProps) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 pt-8 pb-6 text-center">
      <StatusMark tone={tone} />
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-light tracking-tight">{title}</h2>
        <p className="max-w-xs text-sm text-ink-muted">{message}</p>
      </div>
      <div className="mt-2 grid w-full auto-cols-fr grid-flow-col gap-2">
        {actions}
      </div>
    </div>
  );
}

export function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={buttonClassName("primary", "py-3 text-sm")}>
      {label}
    </Link>
  );
}

export function ActionButton({
  label,
  variant,
  onClick,
  disabled,
}: {
  label: string;
  variant: "primary" | "secondary";
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={buttonClassName(variant, "py-3 text-sm")}
    >
      {label}
    </button>
  );
}
