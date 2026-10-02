export interface Point {
  x: number;
  y: number;
}

export interface ChartBox {
  width: number;
  height: number;
  top: number;
}

export function scaleSeries(values: number[], box: ChartBox): Point[] {
  const max = Math.max(0, ...values);
  const usable = box.height - box.top;
  const last = Math.max(1, values.length - 1);
  return values.map((value, position) => ({
    x: (position / last) * box.width,
    y: box.height - (max > 0 ? (value / max) * usable : 0),
  }));
}

export function linePath(points: Point[]): string {
  return points
    .map((p, position) => `${position === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
}

export function areaPath(points: Point[], height: number): string {
  if (points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)} L${last?.x},${height} L${first?.x},${height} Z`;
}
