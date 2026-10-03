"use client";

import { Mesh, Program, Renderer, Triangle } from "ogl";
import { useEffect, useRef } from "react";
import { AURORA_FRAGMENT, AURORA_VERTEX } from "./aurora-shader";

type Rgb = [number, number, number];

const RENDER_SCALE = 0.5;
const PALETTES = {
  dark: {
    colors: [
      [0.9, 0.66, 0.22],
      [0.5, 0.34, 1],
      [0.86, 0.3, 0.72],
    ] as Rgb[],
    strength: 0.85,
  },
  light: {
    colors: [
      [1, 0.8, 0.42],
      [0.72, 0.62, 1],
      [1, 0.62, 0.86],
    ] as Rgb[],
    strength: 0.6,
  },
};

function currentPalette() {
  const light = document.documentElement.dataset.theme === "light";
  return light ? PALETTES.light : PALETTES.dark;
}

function applyPalette(uniforms: Aurora["uniforms"]) {
  const { colors, strength } = currentPalette();
  uniforms.uColorA.value = colors[0];
  uniforms.uColorB.value = colors[1];
  uniforms.uColorC.value = colors[2];
  uniforms.uStrength.value = strength;
}

function createAurora(container: HTMLDivElement) {
  const renderer = new Renderer({
    dpr: RENDER_SCALE,
    alpha: true,
    premultipliedAlpha: true,
  });
  const { gl } = renderer;
  gl.canvas.style.width = "100%";
  gl.canvas.style.height = "100%";
  container.appendChild(gl.canvas);
  const uniforms = {
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uResolution: { value: [1, 1] as [number, number] },
    uColorA: { value: PALETTES.dark.colors[0] },
    uColorB: { value: PALETTES.dark.colors[1] },
    uColorC: { value: PALETTES.dark.colors[2] },
    uStrength: { value: PALETTES.dark.strength },
  };
  const program = new Program(gl, {
    vertex: AURORA_VERTEX,
    fragment: AURORA_FRAGMENT,
    uniforms,
  });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
  return { renderer, uniforms, mesh };
}

type Aurora = ReturnType<typeof createAurora>;

function fitAurora(aurora: Aurora, container: HTMLDivElement) {
  const { renderer, uniforms } = aurora;
  renderer.setSize(container.clientWidth, container.clientHeight);
  uniforms.uResolution.value = [
    container.clientWidth * RENDER_SCALE,
    container.clientHeight * RENDER_SCALE,
  ];
}

function scrollProgress(): number {
  const el = document.scrollingElement ?? document.documentElement;
  const max = el.scrollHeight - el.clientHeight;
  return max > 0 ? el.scrollTop / max : 0;
}

function runAurora(container: HTMLDivElement) {
  const aurora = createAurora(container);
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fit = () => fitAurora(aurora, container);
  let frame = 0;
  const loop = (time: number) => {
    const { uniforms } = aurora;
    uniforms.uTime.value = time * 0.001;
    uniforms.uScroll.value +=
      (scrollProgress() - uniforms.uScroll.value) * 0.06;
    aurora.renderer.render({ scene: aurora.mesh });
    if (!still) frame = requestAnimationFrame(loop);
  };
  const themeWatch = new MutationObserver(() => applyPalette(aurora.uniforms));
  themeWatch.observe(document.documentElement, {
    attributeFilter: ["data-theme"],
  });
  applyPalette(aurora.uniforms);
  window.addEventListener("resize", fit);
  fit();
  frame = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(frame);
    themeWatch.disconnect();
    window.removeEventListener("resize", fit);
    aurora.renderer.gl.getExtension("WEBGL_lose_context")?.loseContext();
    aurora.renderer.gl.canvas.remove();
  };
}

export function AuroraBackdrop({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    return runAurora(ref.current);
  }, []);
  return <div ref={ref} aria-hidden="true" className={className} />;
}
