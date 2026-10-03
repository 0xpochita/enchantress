"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

function useScrollEdges() {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ start: el.scrollLeft <= 1, end: el.scrollLeft >= max - 1 });
  }, []);
  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);
  return { ref, edges, update };
}

export function StepStrip({ children }: { children: ReactNode }) {
  const { ref, edges, update } = useScrollEdges();
  const page = (direction: 1 | -1) =>
    ref.current?.scrollBy({
      left: direction * ref.current.clientWidth * 0.8,
      behavior: "smooth",
    });
  const hidden = edges.start && edges.end;
  return (
    <div className="step-strip-wrap">
      <div ref={ref} className="step-strip" onScroll={update}>
        {children}
      </div>
      <div className="step-controls" hidden={hidden}>
        <button
          type="button"
          aria-label="Previous step"
          disabled={edges.start}
          onClick={() => page(-1)}
        >
          ←
        </button>
        <button
          type="button"
          aria-label="Next step"
          disabled={edges.end}
          onClick={() => page(1)}
        >
          →
        </button>
      </div>
    </div>
  );
}
