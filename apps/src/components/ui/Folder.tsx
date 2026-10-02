"use client";

import { type MouseEvent, type ReactNode, useState } from "react";

interface FolderProps {
  items: ReactNode[];
  label: string;
  defaultOpen?: boolean;
}

interface Offset {
  x: number;
  y: number;
}

const MAX_PAPERS = 3;
const PARALLAX_STRENGTH = 0.15;
const OPEN_TRANSFORMS = [
  "translate(-120%, -70%) rotate(-15deg)",
  "translate(10%, -70%) rotate(15deg)",
  "translate(-50%, -100%) rotate(5deg)",
];
const CLOSED_SIZES = ["w-[70%] h-[80%]", "w-[80%] h-[70%]", "w-[90%] h-[60%]"];
const OPEN_SIZES = ["w-[70%] h-[80%]", "w-[80%] h-[80%]", "w-[90%] h-[80%]"];
const PAPER_COLORS = ["bg-surface-hover", "bg-surface-raised", "bg-surface"];
const FOLDER_BACK = "bg-amber-400";

const restingOffsets = (): Offset[] =>
  Array.from({ length: MAX_PAPERS }, () => ({ x: 0, y: 0 }));

function hoveredPaper(event: MouseEvent<HTMLElement>): HTMLElement | null {
  if (!(event.target instanceof Element)) return null;
  return event.target.closest<HTMLElement>("[data-paper]");
}

function parallaxOffsets(event: MouseEvent<HTMLElement>): Offset[] {
  const paper = hoveredPaper(event);
  const position = Number(paper?.dataset.paper);
  return restingOffsets().map((resting, index) => {
    if (!paper || index !== position) return resting;
    const rect = paper.getBoundingClientRect();
    return {
      x: (event.clientX - (rect.left + rect.width / 2)) * PARALLAX_STRENGTH,
      y: (event.clientY - (rect.top + rect.height / 2)) * PARALLAX_STRENGTH,
    };
  });
}

interface PaperProps {
  position: number;
  isOpen: boolean;
  offset: Offset;
  children: ReactNode;
}

function Paper({ position, isOpen, offset, children }: PaperProps) {
  const sizes = isOpen ? OPEN_SIZES : CLOSED_SIZES;
  const closedMotion =
    "-translate-x-1/2 translate-y-[10%] group-hover:translate-y-0";
  return (
    <span
      data-paper={position}
      className={`absolute bottom-[10%] left-1/2 z-20 block overflow-hidden rounded-[14px] shadow-md transition-all duration-300 ease-in-out ${PAPER_COLORS[position]} ${sizes[position]} ${isOpen ? "hover:scale-110" : closedMotion}`}
      style={
        isOpen
          ? {
              transform: `${OPEN_TRANSFORMS[position]} translate(${offset.x}px, ${offset.y}px)`,
            }
          : undefined
      }
    >
      {children}
    </span>
  );
}

function FolderFlaps({ isOpen }: { isOpen: boolean }) {
  const flap =
    "absolute inset-0 z-30 block origin-bottom rounded-[10px_20px_20px_20px] bg-amber-300 transition-all duration-300 ease-in-out";
  return (
    <>
      <span
        className={`${flap} ${isOpen ? "" : "group-hover:[transform:skew(15deg)_scaleY(0.6)]"}`}
        style={isOpen ? { transform: "skew(15deg) scaleY(0.6)" } : undefined}
      />
      <span
        className={`${flap} ${isOpen ? "" : "group-hover:[transform:skew(-15deg)_scaleY(0.6)]"}`}
        style={isOpen ? { transform: "skew(-15deg) scaleY(0.6)" } : undefined}
      />
    </>
  );
}

export function Folder({ items, label, defaultOpen = false }: FolderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [offsets, setOffsets] = useState<Offset[]>(restingOffsets);
  const papers = items.slice(0, MAX_PAPERS);
  const toggle = () => {
    if (isOpen) setOffsets(restingOffsets());
    setIsOpen(!isOpen);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      onMouseMove={(event) => isOpen && setOffsets(parallaxOffsets(event))}
      onMouseLeave={() => setOffsets(restingOffsets())}
      aria-expanded={isOpen}
      aria-label={`${isOpen ? "Close" : "Open"} ${label}`}
      className={`group relative block transition-transform duration-200 ease-in focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${isOpen ? "-translate-y-2" : "hover:-translate-y-2"}`}
    >
      <span
        className={`relative block h-[160px] w-[200px] rounded-[0_20px_20px_20px] ${FOLDER_BACK}`}
      >
        <span
          className={`absolute bottom-[98%] left-0 block h-[20px] w-[60px] rounded-t-[10px] ${FOLDER_BACK}`}
        />
        {papers.map((item, position) => (
          <Paper
            key={`paper-${position.toString()}`}
            position={position}
            isOpen={isOpen}
            offset={offsets[position]}
          >
            {item}
          </Paper>
        ))}
        <FolderFlaps isOpen={isOpen} />
      </span>
    </button>
  );
}
