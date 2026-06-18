import { ReflectionPath } from './waveSimulator';

const GRID_RESOLUTION = 4;

export interface HeatmapInfo {
  spl: number;
  dominantSource: string;
}

export function generateHeatmap(
  paths: ReflectionPath[],
  roomWidth: number,
  roomHeight: number
): number[][] {
  const cols = Math.ceil(roomWidth / GRID_RESOLUTION);
  const rows = Math.ceil(roomHeight / GRID_RESOLUTION);
  const grid: number[][] = [];

  for (let r = 0; r < rows; r++) {
    grid[r] = new Array(cols).fill(0);
  }

  for (const path of paths) {
    for (const segment of path.segments) {
      const spl = segment.splAtEnd;
      if (spl <= 0) continue;

      const sx = segment.start.x;
  const sy = segment.start.y;
  const ex = segment.end.x;
  const ey = segment.end.y;

  const dx = ex - sx;
  const dy = ey - sy;
  const segLen = Math.sqrt(dx * dx + dy * dy);
  if (segLen < 1) continue;

  const steps = Math.max(1, Math.ceil(segLen / GRID_RESOLUTION));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = sx + dx * t;
    const py = sy + dy * t;

    const col = Math.floor(px / GRID_RESOLUTION);
    const row = Math.floor(py / GRID_RESOLUTION);

    const influenceRadius = 8;
    for (let dr = -influenceRadius; dr <= influenceRadius; dr++) {
      for (let dc = -influenceRadius; dc <= influenceRadius; dc++) {
        const r2 = row + dr;
        const c2 = col + dc;
        if (r2 < 0 || r2 >= rows || c2 < 0 || c2 >= cols) continue;

        const dist = Math.sqrt(dr * dr + dc * dc) * GRID_RESOLUTION;
        const attenuation = spl - 20 * Math.log10(Math.max(1, dist / 10));
        if (attenuation > 0) {
          grid[r2][c2] += Math.pow(10, attenuation / 10);
        }
      }
    }
  }
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid[r][c] = 10 * Math.log10(Math.max(1e-10, grid[r][c]));
    }
  }

  return grid;
}

export function generateHeatmapInfo(
  paths: ReflectionPath[],
  roomWidth: number,
  roomHeight: number
): HeatmapInfo[][] {
  const cols = Math.ceil(roomWidth / GRID_RESOLUTION);
  const rows = Math.ceil(roomHeight / GRID_RESOLUTION);
  const splGrid: number[][] = [];
  const sourceGrid: string[][] = [];

  for (let r = 0; r < rows; r++) {
    splGrid[r] = new Array(cols).fill(0);
    sourceGrid[r] = new Array(cols).fill('');
  }

  const contributionMap: Map<string, { order: number; wallLabel: string; spl: number }>[][][] = [];

  for (const path of paths) {
    for (const segment of path.segments) {
      const spl = segment.splAtEnd;
      if (spl <= 0) continue;

      const sx = segment.start.x;
      const sy = segment.start.y;
      const ex = segment.end.x;
      const ey = segment.end.y;
      const dx = ex - sx;
      const dy = ey - sy;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      if (segLen < 1) continue;

      const steps = Math.max(1, Math.ceil(segLen / GRID_RESOLUTION));

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = sx + dx * t;
        const py = sy + dy * t;
        const col = Math.floor(px / GRID_RESOLUTION);
        const row = Math.floor(py / GRID_RESOLUTION);

        const key = `${segment.reflectionOrder}-${segment.wallLabel}`;
        const influenceRadius = 6;
        for (let dr = -influenceRadius; dr <= influenceRadius; dr++) {
          for (let dc = -influenceRadius; dc <= influenceRadius; dc++) {
            const r2 = row + dr;
            const c2 = col + dc;
            if (r2 < 0 || r2 >= rows || c2 < 0 || c2 >= cols) continue;

            const dist = Math.sqrt(dr * dr + dc * dc) * GRID_RESOLUTION;
            const attenuation = spl - 20 * Math.log10(Math.max(1, dist / 10));
            if (attenuation > 0) {
              splGrid[r2][c2] += Math.pow(10, attenuation / 10);
              if (!sourceGrid[r2][c2] || segment.reflectionOrder <= 3) {
                const ordinal = segment.reflectionOrder === 1 ? '首次' :
                  segment.reflectionOrder === 2 ? '二次' :
                  segment.reflectionOrder === 3 ? '第三次' :
                  `第${segment.reflectionOrder}次`;
                sourceGrid[r2][c2] = `来自${segment.wallLabel}的${ordinal}反射`;
              }
            }
          }
        }
      }
    }
  }

  const result: HeatmapInfo[][] = [];
  for (let r = 0; r < rows; r++) {
    result[r] = [];
    for (let c = 0; c < cols; c++) {
      const db = 10 * Math.log10(Math.max(1e-10, splGrid[r][c]));
      result[r][c] = {
        spl: Math.round(db * 10) / 10,
        dominantSource: sourceGrid[r][c],
      };
    }
  }

  return result;
}

export function splToColor(spl: number, minSPL: number, maxSPL: number): string {
  const range = maxSPL - minSPL;
  const t = range > 0 ? (spl - minSPL) / range : 0.5;
  const clamped = Math.max(0, Math.min(1, t));

  const r = Math.round(255 * clamped);
  const g = Math.round(255 * (1 - Math.abs(clamped * 2 - 1)));
  const b = Math.round(255 * (1 - clamped));

  return `rgb(${r},${g},${b})`;
}

export { GRID_RESOLUTION };
