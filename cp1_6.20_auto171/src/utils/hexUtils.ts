import type { HexCoord, Tile } from '../types';

export const HEX_SIZE = 64;
export const HEX_SIZE_SMALL = 48;
export const GRID_WIDTH = 15;
export const GRID_HEIGHT = 15;

export function hexToPixel(coord: HexCoord, size: number = HEX_SIZE): { x: number; y: number } {
  const x = size * (3 / 2) * coord.q;
  const y = size * (Math.sqrt(3) / 2 * coord.q + Math.sqrt(3) * coord.r);
  return { x, y };
}

export function pixelToHex(x: number, y: number, size: number = HEX_SIZE): HexCoord {
  const q = (2 / 3 * x) / size;
  const r = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / size;
  return hexRound({ q, r });
}

export function hexRound(coord: { q: number; r: number }): HexCoord {
  const s = -coord.q - coord.r;
  let rq = Math.round(coord.q);
  let rr = Math.round(coord.r);
  let rs = Math.round(s);

  const qDiff = Math.abs(rq - coord.q);
  const rDiff = Math.abs(rr - coord.r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }

  return { q: rq, r: rr };
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

export const hexDirections: HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function hexNeighbors(coord: HexCoord): HexCoord[] {
  return hexDirections.map(dir => ({
    q: coord.q + dir.q,
    r: coord.r + dir.r,
  }));
}

export function generateGrid(): Tile[] {
  const tiles: Tile[] = [];
  for (let q = 0; q < GRID_WIDTH; q++) {
    for (let r = 0; r < GRID_HEIGHT; r++) {
      let terrain: Tile['terrain'] = 'grass';
      
      if (q === 0 && r === Math.floor(GRID_HEIGHT / 2)) {
        terrain = 'base_player';
      } else if (q === GRID_WIDTH - 1 && r === Math.floor(GRID_HEIGHT / 2)) {
        terrain = 'base_ai';
      } else {
        const rand = Math.random();
        if (rand < 0.08) {
          terrain = 'rock';
        } else if (rand < 0.15) {
          terrain = 'tree';
        }
      }

      tiles.push({
        coord: { q, r },
        terrain,
      });
    }
  }
  return tiles;
}

export function isWalkable(tile: Tile): boolean {
  return tile.terrain === 'grass' || tile.terrain === 'base_player' || tile.terrain === 'base_ai';
}

export function hexKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

export function hexCorners(center: { x: number; y: number }, size: number): string {
  const corners: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const x = center.x + size * Math.cos(angle);
    const y = center.y + size * Math.sin(angle);
    corners.push(`${x},${y}`);
  }
  return corners.join(' ');
}
