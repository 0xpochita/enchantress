export interface ArcPosition {
  leftPct: number;
  topPct: number;
}

const DEGREES_TO_RADIANS = Math.PI / 180;
const PERCENT = 100;

export function arcPosition(
  radiusOfWidth: number,
  angleDeg: number,
  heightToWidth: number,
): ArcPosition {
  const angle = angleDeg * DEGREES_TO_RADIANS;
  return {
    leftPct: 50 + radiusOfWidth * Math.cos(angle) * PERCENT,
    topPct:
      PERCENT - (radiusOfWidth * Math.sin(angle) * PERCENT) / heightToWidth,
  };
}
