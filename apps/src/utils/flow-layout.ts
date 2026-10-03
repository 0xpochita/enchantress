export interface Box {
  top: number;
  height: number;
}

export interface FlowBand {
  path: string;
  nodeTop: number;
  nodeHeight: number;
}

export interface FlowLayoutInput {
  weights: number[];
  height: number;
  gap: number;
  nodeX: number;
  hubX: number;
}

type Span = [number, number];

export function band(x0: number, y0: Span, x1: number, y1: Span): string {
  const mid = (x0 + x1) / 2;
  return [
    `M${x0},${y0[0]}`,
    `C${mid},${y0[0]} ${mid},${y1[0]} ${x1},${y1[0]}`,
    `L${x1},${y1[1]}`,
    `C${mid},${y1[1]} ${mid},${y0[1]} ${x0},${y0[1]}`,
    "Z",
  ].join(" ");
}

export function stackBoxes(
  weights: number[],
  height: number,
  gap: number,
): Box[] {
  const total = weights.reduce((sum, w) => sum + w, 0);
  const usable = height - gap * (weights.length - 1);
  let top = 0;
  return weights.map((weight) => {
    const box = { top, height: (usable * weight) / total };
    top += box.height + gap;
    return box;
  });
}

export function splitBox(box: Box, weights: number[]): Box[] {
  return stackBoxes(weights, box.height, 0).map((part) => ({
    top: box.top + part.top,
    height: part.height,
  }));
}

export function flowBands(input: FlowLayoutInput): FlowBand[] {
  const { weights, height, gap, nodeX, hubX } = input;
  const hub = splitBox({ top: height * 0.2, height: height * 0.6 }, weights);
  return stackBoxes(weights, height, gap).map((node, i) => ({
    path: band(nodeX, [node.top, node.top + node.height], hubX, [
      hub[i].top,
      hub[i].top + hub[i].height,
    ]),
    nodeTop: node.top,
    nodeHeight: node.height,
  }));
}

export function groupTargets(
  groups: number[][],
  height: number,
  gap: number,
): { boxes: Box[]; segments: Box[][] } {
  const totals = groups.map((g) => g.reduce((sum, w) => sum + w, 0));
  const boxes = stackBoxes(totals, height, gap);
  return { boxes, segments: boxes.map((box, i) => splitBox(box, groups[i])) };
}
