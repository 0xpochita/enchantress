import type { BeamRefs } from "@/hooks/useBeamAnimation";

const STOPS = [
  { offset: "0%", color: "var(--accent-deep)", opacity: 0 },
  { offset: "20%", color: "var(--accent-deep)", opacity: 0.8 },
  { offset: "50%", color: "var(--beam-core)", opacity: 1 },
  { offset: "80%", color: "var(--accent)", opacity: 0.8 },
  { offset: "100%", color: "var(--accent)", opacity: 0 },
];

export function BeamSvg({ nodes }: { nodes: BeamRefs }) {
  return (
    <svg className="beam-svg" aria-hidden="true">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feComposite in="SourceGraphic" in2="coloredBlur" operator="over" />
        </filter>
        <linearGradient
          id="beam-gradient"
          gradientUnits="userSpaceOnUse"
          x1="0%"
          x2="10%"
          y1="0%"
          y2="0%"
          ref={(el) => {
            nodes.gradient = el;
          }}
        >
          {STOPS.map((stop) => (
            <stop
              key={stop.offset}
              offset={stop.offset}
              style={{ stopColor: stop.color }}
              stopOpacity={stop.opacity}
            />
          ))}
        </linearGradient>
      </defs>
      <path
        className="beam-glow"
        fill="none"
        stroke="url(#beam-gradient)"
        strokeWidth="2"
        filter="url(#glow)"
        ref={(el) => {
          nodes.glowPath = el;
        }}
      />
      <path
        fill="none"
        stroke="url(#beam-gradient)"
        strokeWidth="0.8"
        ref={(el) => {
          nodes.corePath = el;
        }}
      />
    </svg>
  );
}
