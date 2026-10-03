"use client";

import { Mesh, Program, Renderer, Triangle } from "ogl";
import { useEffect, useRef, useState } from "react";
import { RAYS_FRAGMENT, RAYS_VERTEX } from "./light-rays-shader";

type Vec2 = [number, number];

type Rgb = [number, number, number];

interface RaysOptions {
  color: Rgb;
  lightColor: Rgb;
  speed: number;
  spread: number;
  length: number;
  mouseInfluence: number;
}

function createScene(container: HTMLDivElement, options: RaysOptions) {
  const renderer = new Renderer({
    dpr: 1,
    alpha: true,
    premultipliedAlpha: true,
  });
  const { gl } = renderer;
  gl.canvas.style.width = "100%";
  gl.canvas.style.height = "100%";
  container.appendChild(gl.canvas);
  const uniforms = {
    iTime: { value: 0 },
    iResolution: { value: [1, 1] as Vec2 },
    rayPos: { value: [0, 0] as Vec2 },
    rayDir: { value: [0, 1] as Vec2 },
    raysColor: { value: options.color },
    raysSpeed: { value: options.speed },
    lightSpread: { value: options.spread },
    rayLength: { value: options.length },
    fadeDistance: { value: 1 },
    mousePos: { value: [0.5, 0.5] as Vec2 },
    mouseInfluence: { value: options.mouseInfluence },
  };
  const program = new Program(gl, {
    vertex: RAYS_VERTEX,
    fragment: RAYS_FRAGMENT,
    uniforms,
  });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
  return { renderer, uniforms, mesh };
}

type Scene = ReturnType<typeof createScene>;

function fitScene(scene: Scene, container: HTMLDivElement) {
  const { renderer, uniforms } = scene;
  renderer.setSize(container.clientWidth, container.clientHeight);
  const w = container.clientWidth * renderer.dpr;
  const h = container.clientHeight * renderer.dpr;
  uniforms.iResolution.value = [w, h];
  uniforms.rayPos.value = [w / 2, -0.2 * h];
}

function destroyScene(scene: Scene) {
  const { gl } = scene.renderer;
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  gl.canvas.remove();
}

function trackPointer(container: HTMLDivElement, target: Vec2) {
  const onMove = (event: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    target[0] = (event.clientX - rect.left) / rect.width;
    target[1] = (event.clientY - rect.top) / rect.height;
  };
  window.addEventListener("pointermove", onMove);
  return () => window.removeEventListener("pointermove", onMove);
}

function themeColor(options: RaysOptions): Rgb {
  const light = document.documentElement.dataset.theme === "light";
  return light ? options.lightColor : options.color;
}

function watchTheme(scene: Scene, options: RaysOptions) {
  const apply = () => {
    scene.uniforms.raysColor.value = themeColor(options);
  };
  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, {
    attributeFilter: ["data-theme"],
  });
  apply();
  return () => observer.disconnect();
}

function runScene(container: HTMLDivElement, options: RaysOptions) {
  const scene = createScene(container, options);
  const stopTheme = watchTheme(scene, options);
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const target: Vec2 = [0.5, 0.5];
  const mouse = scene.uniforms.mousePos.value;
  const fit = () => fitScene(scene, container);
  let frame = 0;
  const loop = (time: number) => {
    scene.uniforms.iTime.value = time * 0.001;
    mouse[0] += (target[0] - mouse[0]) * 0.08;
    mouse[1] += (target[1] - mouse[1]) * 0.08;
    scene.renderer.render({ scene: scene.mesh });
    if (!still) frame = requestAnimationFrame(loop);
  };
  const stopPointer = still ? () => {} : trackPointer(container, target);
  window.addEventListener("resize", fit);
  fit();
  frame = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(frame);
    stopPointer();
    stopTheme();
    window.removeEventListener("resize", fit);
    destroyScene(scene);
  };
}

function useOnScreen(ref: React.RefObject<HTMLDivElement | null>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return visible;
}

interface LightRaysProps extends Partial<RaysOptions> {
  color: Rgb;
  className?: string;
}

export function LightRays({ className = "", ...props }: LightRaysProps) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(ref);
  const { color, speed = 0.8, spread = 0.9, length = 1.6 } = props;
  const lightColor = props.lightColor ?? color;
  const mouseInfluence = props.mouseInfluence ?? 0.08;
  useEffect(() => {
    if (!visible || !ref.current) return;
    return runScene(ref.current, {
      color,
      lightColor,
      speed,
      spread,
      length,
      mouseInfluence,
    });
  }, [visible, color, lightColor, speed, spread, length, mouseInfluence]);
  return <div ref={ref} aria-hidden="true" className={className} />;
}
