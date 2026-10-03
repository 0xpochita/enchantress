"use client";

import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CryptoIcon, RollingNumber } from "@/components/ui";

const ASSETS = [
  { symbol: "USDC", iconKey: "usdc" },
  { symbol: "WETH", iconKey: "eth" },
  { symbol: "WMON", iconKey: "monad" },
];

const RECIPES = [
  [50, 30, 20],
  [34, 33, 33],
  [60, 25, 15],
  [40, 20, 40],
];

const CYCLE_MS = 2600;

function useRecipeIndex(active: boolean) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % RECIPES.length),
      CYCLE_MS,
    );
    return () => clearInterval(timer);
  }, [active]);
  return index;
}

export function RecipeCycle() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const weights = RECIPES[useRecipeIndex(inView)];
  return (
    <div ref={ref} className="bento-recipe">
      <div className="bento-recipe-bar" aria-hidden="true">
        {ASSETS.map((a, i) => (
          <span key={a.symbol} style={{ flexGrow: weights[i] }} />
        ))}
      </div>
      <ul className="bento-recipe-legend">
        {ASSETS.map((a, i) => (
          <li key={a.symbol}>
            <CryptoIcon iconKey={a.iconKey} label="" size={18} />
            {a.symbol}
            <RollingNumber value={weights[i]} decimals={0} suffix="%" />
          </li>
        ))}
      </ul>
    </div>
  );
}
