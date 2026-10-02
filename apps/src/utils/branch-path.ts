export interface BranchGeometry {
  rowHeight: number;
  indent: number;
  trunk: number;
  radius: number;
  pad: number;
}

const BRANCH_GAP = 8;

const curve = (g: BranchGeometry) => Math.min(g.radius, g.rowHeight / 2 - 2);
const branchEnd = (g: BranchGeometry) => g.indent - BRANCH_GAP;

export function rowCenter(g: BranchGeometry, row: number): number {
  return g.pad + row * g.rowHeight + g.rowHeight / 2;
}

export function trunkPath(g: BranchGeometry, rows: number): string {
  return `M ${g.trunk} 0 V ${rowCenter(g, rows - 1) - curve(g)}`;
}

export function branchPath(g: BranchGeometry, row: number): string {
  const r = curve(g);
  const y = rowCenter(g, row);
  return `M ${g.trunk} ${y - r} A ${r} ${r} 0 0 0 ${g.trunk + r} ${y} H ${branchEnd(g)}`;
}

export function reachPath(g: BranchGeometry, row: number): string {
  const r = curve(g);
  const y = rowCenter(g, row);
  return `M ${g.trunk} 0 V ${y - r} A ${r} ${r} 0 0 0 ${g.trunk + r} ${y} H ${branchEnd(g)}`;
}

export function reachLength(g: BranchGeometry, row: number): number {
  const r = curve(g);
  return (
    rowCenter(g, row) - r + (Math.PI * r) / 2 + (branchEnd(g) - g.trunk - r)
  );
}
