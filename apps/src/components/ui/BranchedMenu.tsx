"use client";

import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import {
  type BranchGeometry,
  branchPath,
  reachLength,
  reachPath,
  trunkPath,
} from "@/utils/branch-path";

export interface BranchChild {
  value: string;
  label: string;
  icon?: ReactNode;
  meta?: ReactNode;
}

export interface BranchSection {
  label: string;
  icon?: ReactNode;
  meta?: ReactNode;
  children: BranchChild[];
}

interface BranchedMenuProps {
  label: string;
  sections: BranchSection[];
  defaultActive?: string;
}

const GEOMETRY: BranchGeometry = {
  rowHeight: 44,
  indent: 40,
  trunk: 14,
  radius: 10,
  pad: 6,
};
const MARKER_HEIGHT = 16;
const LINE =
  "fill-none stroke-line [stroke-width:1.5] [stroke-linecap:round] [stroke-linejoin:round]";

function SectionLines({
  rows,
  activeRow,
}: {
  rows: number;
  activeRow: number;
}) {
  const height = GEOMETRY.pad * 2 + rows * GEOMETRY.rowHeight;
  const indexes = Array.from({ length: rows }, (_, row) => row);
  return (
    <svg
      aria-hidden="true"
      width={GEOMETRY.indent}
      height={height}
      className="pointer-events-none absolute top-0 left-0 overflow-visible opacity-0 transition-opacity duration-200 group-data-[open]/section:opacity-100"
    >
      <path className={LINE} d={trunkPath(GEOMETRY, rows)} />
      {indexes.map((row) => (
        <path
          key={`branch-${row.toString()}`}
          className={LINE}
          d={branchPath(GEOMETRY, row)}
        />
      ))}
      {indexes.map((row) => (
        <path
          key={`reach-${row.toString()}`}
          className="fill-none stroke-brand [stroke-width:1.5] [stroke-linecap:round] [stroke-linejoin:round] transition-[stroke-dashoffset] duration-400 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
          d={reachPath(GEOMETRY, row)}
          style={{
            strokeDasharray: reachLength(GEOMETRY, row),
            strokeDashoffset:
              row === activeRow ? 0 : reachLength(GEOMETRY, row),
          }}
        />
      ))}
    </svg>
  );
}

interface ChildRowProps {
  child: BranchChild;
  isActive: boolean;
  isVisible: boolean;
  onSelect: (value: string) => void;
}

function ChildRow({ child, isActive, isVisible, onSelect }: ChildRowProps) {
  return (
    <button
      type="button"
      aria-current={isActive ? "true" : undefined}
      tabIndex={isVisible ? 0 : -1}
      onClick={() => onSelect(child.value)}
      className="flex w-full items-center gap-2 text-left text-sm text-ink-muted transition-colors duration-200 hover:text-ink aria-[current=true]:font-medium aria-[current=true]:text-ink"
      style={{ height: GEOMETRY.rowHeight, paddingLeft: GEOMETRY.indent }}
    >
      {child.icon && (
        <span aria-hidden className="inline-flex flex-none">
          {child.icon}
        </span>
      )}
      <span className="whitespace-nowrap">{child.label}</span>
      {child.meta && (
        <span className="ml-auto text-xs text-ink-muted">{child.meta}</span>
      )}
    </button>
  );
}

interface SectionProps {
  section: BranchSection;
  isOpen: boolean;
  active: string;
  onToggle: () => void;
  onSelect: (value: string) => void;
  headRef: (element: HTMLButtonElement | null) => void;
}

function Section({
  section,
  isOpen,
  active,
  onToggle,
  onSelect,
  headRef,
}: SectionProps) {
  const activeRow = section.children.findIndex(
    (child) => child.value === active,
  );
  const bodyHeight =
    GEOMETRY.pad * 2 + section.children.length * GEOMETRY.rowHeight;
  return (
    <div
      className="group/section flex flex-col"
      data-open={isOpen ? "" : undefined}
    >
      <button
        ref={headRef}
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="flex items-center gap-2 py-2.5 text-left font-medium text-ink-muted transition-colors duration-200 hover:text-ink group-data-[open]/section:text-ink"
      >
        {section.icon}
        {section.label}
        {section.meta && (
          <span className="ml-auto text-xs font-normal text-ink-muted">
            {section.meta}
          </span>
        )}
      </button>
      <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-data-[open]/section:grid-rows-[1fr] motion-reduce:transition-none">
        <div className="min-h-0 overflow-hidden">
          <div className="relative py-1.5" style={{ height: bodyHeight }}>
            <SectionLines
              rows={section.children.length}
              activeRow={activeRow}
            />
            {section.children.map((child) => (
              <ChildRow
                key={child.value}
                child={child}
                isActive={child.value === active}
                isVisible={isOpen}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function useSectionMarker(activeSection: number, isShown: boolean) {
  const markerRef = useRef<HTMLSpanElement>(null);
  const headsRef = useRef<(HTMLButtonElement | null)[]>([]);
  useLayoutEffect(() => {
    const marker = markerRef.current;
    const head = headsRef.current[activeSection];
    if (!marker) return;
    if (isShown && head)
      marker.style.top = `${head.offsetTop + (head.offsetHeight - MARKER_HEIGHT) / 2}px`;
    marker.toggleAttribute("data-on", Boolean(isShown && head));
  }, [activeSection, isShown]);
  return { markerRef, headsRef };
}

export function BranchedMenu({
  label,
  sections,
  defaultActive,
}: BranchedMenuProps) {
  const [open, setOpen] = useState(
    () => new Set(sections.map((_, position) => position)),
  );
  const [active, setActive] = useState(
    defaultActive ?? sections[0]?.children[0]?.value ?? "",
  );
  const activeSection = sections.findIndex((section) =>
    section.children.some((child) => child.value === active),
  );
  const { markerRef, headsRef } = useSectionMarker(
    activeSection,
    open.has(activeSection),
  );
  const toggle = (position: number) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(position)) next.delete(position);
      else next.add(position);
      return next;
    });

  return (
    <nav
      aria-label={label}
      className="relative flex w-full flex-col pl-3.5 before:absolute before:top-2 before:bottom-0 before:left-0 before:w-0.5 before:rounded-[1px] before:bg-[linear-gradient(to_bottom,var(--line),var(--line)_55%,transparent)] before:content-['']"
    >
      <span
        ref={markerRef}
        aria-hidden="true"
        className="absolute left-0 z-[1] h-4 w-0.5 rounded-[1px] bg-brand opacity-0 transition-[top,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] data-[on]:opacity-100"
      />
      {sections.map((section, position) => (
        <Section
          key={section.label}
          section={section}
          isOpen={open.has(position)}
          active={active}
          onToggle={() => toggle(position)}
          onSelect={setActive}
          headRef={(element) => {
            headsRef.current[position] = element;
          }}
        />
      ))}
    </nav>
  );
}
