export type BeamPhase = "p1" | "splash" | "p2" | "idle";

export interface BeamFrame {
  percentage: number | null;
  isStackActive: boolean;
  isShieldActive: boolean;
  isBeamVisible: boolean;
  isSplashing: boolean;
}

export const PHASE_DURATION_MS: Record<BeamPhase, number> = {
  p1: 800,
  splash: 800,
  p2: 800,
  idle: 1000,
};

const NEXT_PHASE: Record<BeamPhase, BeamPhase> = {
  p1: "splash",
  splash: "p2",
  p2: "idle",
  idle: "p1",
};

const HALF = 0.5;
const STACK_GLOW_UNTIL = 0.4;
const SHIELD_GLOW_FROM = 0.6;
const BEAM_HALF_WIDTH = 5;
const PERCENT = 100;

const RESTING: BeamFrame = {
  percentage: null,
  isStackActive: false,
  isShieldActive: false,
  isBeamVisible: true,
  isSplashing: false,
};

export function nextBeamPhase(phase: BeamPhase): BeamPhase {
  return NEXT_PHASE[phase];
}

export function isPhaseDone(phase: BeamPhase, elapsedMs: number): boolean {
  return elapsedMs >= PHASE_DURATION_MS[phase];
}

export function beamFrame(phase: BeamPhase, elapsedMs: number): BeamFrame {
  const progress = Math.min(elapsedMs / PHASE_DURATION_MS[phase], 1);
  if (phase === "p1") {
    return {
      ...RESTING,
      percentage: HALF * progress,
      isStackActive: progress < STACK_GLOW_UNTIL,
    };
  }
  if (phase === "p2") {
    return {
      ...RESTING,
      percentage: HALF + HALF * progress,
      isShieldActive: progress > SHIELD_GLOW_FROM,
    };
  }
  if (phase === "splash")
    return { ...RESTING, isBeamVisible: false, isSplashing: true };
  return RESTING;
}

export function beamGradientWindow(percentage: number): {
  x1: string;
  x2: string;
} {
  const center = percentage * PERCENT;
  return {
    x1: `${center - BEAM_HALF_WIDTH}%`,
    x2: `${center + BEAM_HALF_WIDTH}%`,
  };
}
