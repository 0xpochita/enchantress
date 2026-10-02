"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";

interface ThemeToggleProps {
  className?: string;
}

function useIsDark(): boolean {
  const { resolvedTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  return isMounted && resolvedTheme === "dark";
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { setTheme } = useTheme();
  const isDark = useIsDark();
  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "flex h-8 w-16 shrink-0 cursor-pointer rounded-full p-1 transition-all duration-300",
        isDark
          ? "border border-zinc-800 bg-zinc-950"
          : "border border-zinc-200 bg-white",
        className,
      )}
    >
      <span className="flex w-full items-center justify-between">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full transition-transform duration-300",
            isDark ? "translate-x-0 bg-zinc-800" : "translate-x-8 bg-gray-200",
          )}
        >
          {isDark ? (
            <Moon aria-hidden className="size-4 text-white" strokeWidth={1.5} />
          ) : (
            <Sun
              aria-hidden
              className="size-4 text-gray-700"
              strokeWidth={1.5}
            />
          )}
        </span>
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full transition-transform duration-300",
            isDark ? "bg-transparent" : "-translate-x-8",
          )}
        >
          {isDark ? (
            <Sun
              aria-hidden
              className="size-4 text-gray-500"
              strokeWidth={1.5}
            />
          ) : (
            <Moon aria-hidden className="size-4 text-black" strokeWidth={1.5} />
          )}
        </span>
      </span>
    </button>
  );
}
