const HEX_MIDPOINT = 7;

export function identiconCells(address: string, size = 5): boolean[] {
  const hex = address.toLowerCase().replace(/^0x/, "") || "0";
  const half = Math.ceil(size / 2);
  return Array.from({ length: size * size }, (_, cell) => {
    const row = Math.floor(cell / size);
    const column = cell % size;
    const mirrored = column < half ? column : size - 1 - column;
    const digit = hex[(row * half + mirrored) % hex.length] ?? "0";
    return Number.parseInt(digit, 16) > HEX_MIDPOINT;
  });
}
