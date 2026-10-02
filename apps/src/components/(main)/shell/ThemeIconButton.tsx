"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeIconButton() {
  const { resolvedTheme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  const isDark = isMounted && resolvedTheme === "dark";
  const Icon = isDark ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors duration-200 hover:bg-surface-raised hover:text-ink"
    >
      <Icon aria-hidden className="size-[18px]" />
    </button>
  );
}
