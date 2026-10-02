import { useEffect, useRef } from "react";
import {
  type BeamFrame,
  type BeamPhase,
  beamFrame,
  beamGradientWindow,
  isPhaseDone,
  nextBeamPhase,
} from "@/utils/beam";

export interface BeamRefs {
  pipeline: HTMLDivElement | null;
  source: HTMLDivElement | null;
  center: HTMLDivElement | null;
  target: HTMLDivElement | null;
  glowPath: SVGPathElement | null;
  corePath: SVGPathElement | null;
  gradient: SVGLinearGradientElement | null;
  splash: HTMLDivElement | null;
}

type ReadyRefs = { [K in keyof BeamRefs]: NonNullable<BeamRefs[K]> };

function isReady(refs: BeamRefs): refs is ReadyRefs {
  return Object.values(refs).every((element) => element !== null);
}

function centerOf(element: Element, origin: DOMRect): string {
  const rect = element.getBoundingClientRect();
  return `${rect.left + rect.width / 2 - origin.left},${rect.top + rect.height / 2 - origin.top}`;
}

function drawBeamPath(refs: ReadyRefs): void {
  const origin = refs.pipeline.getBoundingClientRect();
  const path = `M ${centerOf(refs.source, origin)} L ${centerOf(refs.center, origin)} L ${centerOf(refs.target, origin)}`;
  refs.glowPath.setAttribute("d", path);
  refs.corePath.setAttribute("d", path);
}

function applyFrame(refs: ReadyRefs, frame: BeamFrame): void {
  refs.source.classList.toggle("active", frame.isStackActive);
  refs.target.classList.toggle("active", frame.isShieldActive);
  refs.splash.classList.toggle("animate", frame.isSplashing);
  const opacity = frame.isBeamVisible ? "" : "0";
  refs.glowPath.style.opacity = opacity;
  refs.corePath.style.opacity = opacity;
  if (frame.percentage === null) return;
  const { x1, x2 } = beamGradientWindow(frame.percentage);
  refs.gradient.setAttribute("x1", x1);
  refs.gradient.setAttribute("x2", x2);
}

const ROTATE_ON_ENTER: Partial<Record<BeamPhase, keyof ReadyRefs>> = {
  splash: "center",
  p1: "target",
};

function showNextLogo(container: Element): void {
  const logos = Array.from(container.querySelectorAll(".pipeline-logo"));
  const current = logos.findIndex((logo) =>
    logo.classList.contains("is-active"),
  );
  logos.forEach((logo, position) => {
    logo.classList.toggle(
      "is-active",
      position === (current + 1) % logos.length,
    );
  });
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function startBeamLoop(refs: ReadyRefs): () => void {
  let phase: BeamPhase = "p1";
  let phaseStart = performance.now();
  let frameId = 0;
  const tick = (now: number) => {
    applyFrame(refs, beamFrame(phase, now - phaseStart));
    if (isPhaseDone(phase, now - phaseStart)) {
      phase = nextBeamPhase(phase);
      phaseStart = now;
      const rotating = ROTATE_ON_ENTER[phase];
      if (rotating) showNextLogo(refs[rotating]);
    }
    frameId = requestAnimationFrame(tick);
  };
  frameId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frameId);
}

export function useBeamAnimation() {
  const refs = useRef<BeamRefs>({
    pipeline: null,
    source: null,
    center: null,
    target: null,
    glowPath: null,
    corePath: null,
    gradient: null,
    splash: null,
  });

  useEffect(() => {
    const current = { ...refs.current };
    if (!isReady(current)) return;
    const redraw = () => drawBeamPath(current);
    redraw();
    window.addEventListener("resize", redraw);
    const stopLoop = prefersReducedMotion() ? () => {} : startBeamLoop(current);
    return () => {
      window.removeEventListener("resize", redraw);
      stopLoop();
    };
  }, []);

  return refs;
}
