import { HexCoord, Formation, GRID_COLS, GRID_ROWS, HEX_SIZE } from './types';
import { getUnitByType } from './data';

export function hexToPixel(hex: HexCoord, hexSize: number = HEX_SIZE): { x: number; y: number } {
  const x = hexSize * 1.5 * hex.q;
  const y = hexSize * Math.sqrt(3) * (hex.r + 0.5 * (hex.q & 1));
  return { x, y };
}

export function pixelToHex(x: number, y: number, hexSize: number = HEX_SIZE): HexCoord {
  const q = x / (hexSize * 1.5);
  const r = (y / (hexSize * Math.sqrt(3))) - 0.5 * (Math.round(q) & 1);
  return hexRound({ q, r });
}

function hexRound(hex: { q: number; r: number }): HexCoord {
  const s = -hex.q - hex.r;
  let rq = Math.round(hex.q);
  let rr = Math.round(hex.r);
  const rs = Math.round(s);

  const qDiff = Math.abs(rq - hex.q);
  const rDiff = Math.abs(rr - hex.r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }

  return { q: rq, r: rr };
}

export function isValidHex(hex: HexCoord): boolean {
  return hex.q >= 0 && hex.q < GRID_COLS && hex.r >= 0 && hex.r < GRID_ROWS;
}

export function getHexCorners(centerX: number, centerY: number, hexSize: number = HEX_SIZE): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    corners.push({
      x: centerX + hexSize * Math.cos(angle),
      y: centerY + hexSize * Math.sin(angle)
    });
  }
  return corners;
}

export function calculateFormationPositions(
  formation: Formation,
  center: HexCoord
): { position: HexCoord; unit: ReturnType<typeof getUnitByType> }[] {
  const result: { position: HexCoord; unit: ReturnType<typeof getUnitByType> }[] = [];

  for (const pos of formation.pattern) {
    const absolutePos: HexCoord = {
      q: center.q + pos.offset.q,
      r: center.r + pos.offset.r
    };

    if (isValidHex(absolutePos)) {
      result.push({
        position: absolutePos,
        unit: getUnitByType(pos.unitType)
      });
    }
  }

  return result;
}

export function getPreviewPositions(formation: Formation, center: HexCoord): HexCoord[] {
  const result: HexCoord[] = [];

  for (const pos of formation.pattern) {
    const absolutePos: HexCoord = {
      q: center.q + pos.offset.q,
      r: center.r + pos.offset.r
    };

    if (isValidHex(absolutePos)) {
      result.push(absolutePos);
    }
  }

  return result;
}

export function getNeighbors(hex: HexCoord): HexCoord[] {
  const evenRowOffsets: HexCoord[] = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: -1 }, { q: -1, r: 0 }, { q: 0, r: 1 }
  ];
  const oddRowOffsets: HexCoord[] = [
    { q: 1, r: 1 }, { q: 1, r: 0 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
  ];

  const offsets = (hex.r & 1) === 0 ? evenRowOffsets : oddRowOffsets;
  return offsets
    .map(offset => ({ q: hex.q + offset.q, r: hex.r + offset.r }))
    .filter(isValidHex);
}

export function isAdjacent(a: HexCoord, b: HexCoord): boolean {
  const neighbors = getNeighbors(a);
  return neighbors.some(n => n.q === b.q && n.r === b.r);
}

export function hexEquals(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

export function generateAllHexes(): HexCoord[] {
  const hexes: HexCoord[] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let q = 0; q < GRID_COLS; q++) {
      hexes.push({ q, r });
    }
  }
  return hexes;
}

export function calculateBoardBounds(hexSize: number = HEX_SIZE): { width: number; height: number; offsetX: number; offsetY: number } {
  const allHexes = generateAllHexes();
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const hex of allHexes) {
    const { x, y } = hexToPixel(hex, hexSize);
    minX = Math.min(minX, x - hexSize);
    maxX = Math.max(maxX, x + hexSize);
    minY = Math.min(minY, y - hexSize);
    maxY = Math.max(maxY, y + hexSize);
  }

  const padding = hexSize * 0.5;
  return {
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
    offsetX: -minX + padding,
    offsetY: -minY + padding
  };
}
