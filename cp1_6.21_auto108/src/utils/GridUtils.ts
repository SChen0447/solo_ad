export const GRID_COLS = 16;
export const GRID_ROWS = 12;

export const HEX_SIZE = 32;

export const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
export const HEX_HEIGHT = 2 * HEX_SIZE;

export const HEX_HORIZ_SPACING = HEX_WIDTH;
export const HEX_VERT_SPACING = HEX_HEIGHT * 0.75;

export interface HexCoord {
  col: number;
  row: number;
}

export function hexToPixel(col: number, row: number): { x: number; y: number } {
  const x = col * HEX_HORIZ_SPACING + (row % 2 === 1 ? HEX_HORIZ_SPACING / 2 : 0) + HEX_WIDTH / 2;
  const y = row * HEX_VERT_SPACING + HEX_HEIGHT / 2;
  return { x, y };
}

export function pixelToHex(px: number, py: number): HexCoord {
  const approxRow = py / HEX_VERT_SPACING;
  const row = Math.round(approxRow);
  const offsetX = row % 2 === 1 ? HEX_HORIZ_SPACING / 2 : 0;
  const col = Math.round((px - offsetX) / HEX_HORIZ_SPACING);
  return { col, row };
}

export function isValidHex(col: number, row: number): boolean {
  return col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS;
}

const EVEN_ROW_DIRS = [
  { dc: 1, dr: 0 }, { dc: -1, dr: 0 },
  { dc: 0, dr: -1 }, { dc: 0, dr: 1 },
  { dc: 1, dr: -1 }, { dc: 1, dr: 1 },
];

const ODD_ROW_DIRS = [
  { dc: 1, dr: 0 }, { dc: -1, dr: 0 },
  { dc: 0, dr: -1 }, { dc: 0, dr: 1 },
  { dc: -1, dr: -1 }, { dc: -1, dr: 1 },
];

export function getNeighbors(col: number, row: number): HexCoord[] {
  const dirs = row % 2 === 0 ? EVEN_ROW_DIRS : ODD_ROW_DIRS;
  const result: HexCoord[] = [];
  for (const d of dirs) {
    const nc = col + d.dc;
    const nr = row + d.dr;
    if (isValidHex(nc, nr)) {
      result.push({ col: nc, row: nr });
    }
  }
  return result;
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  const ac = offsetToCube(a.col, a.row);
  const bc = offsetToCube(b.col, b.row);
  return (Math.abs(ac.q - bc.q) + Math.abs(ac.r - bc.r) + Math.abs(ac.s - bc.s)) / 2;
}

function offsetToCube(col: number, row: number): { q: number; r: number; s: number } {
  const q = col - (row - (row & 1)) / 2;
  const r = row;
  const s = -q - r;
  return { q, r, s };
}

export function getHexCorners(cx: number, cy: number, size: number): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 30;
    const angleRad = (Math.PI / 180) * angleDeg;
    corners.push({
      x: cx + size * Math.cos(angleRad),
      y: cy + size * Math.sin(angleRad),
    });
  }
  return corners;
}

export function getGridPixelWidth(): number {
  return (GRID_COLS + 0.5) * HEX_HORIZ_SPACING;
}

export function getGridPixelHeight(): number {
  return (GRID_ROWS - 1) * HEX_VERT_SPACING + HEX_HEIGHT;
}
