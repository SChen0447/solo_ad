import type { Bounds, GridSize, ScalarDataset, VectorDataset } from '../types';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getGridIndex(ix: number, iy: number, iz: number, gridSize: GridSize): number {
  return iz * gridSize.nx * gridSize.ny + iy * gridSize.nx + ix;
}

export function worldToGrid(
  pos: [number, number, number],
  bounds: Bounds,
  gridSize: GridSize
): [number, number, number] {
  const gx = ((pos[0] - bounds.min[0]) / (bounds.max[0] - bounds.min[0])) * (gridSize.nx - 1);
  const gy = ((pos[1] - bounds.min[1]) / (bounds.max[1] - bounds.min[1])) * (gridSize.ny - 1);
  const gz = ((pos[2] - bounds.min[2]) / (bounds.max[2] - bounds.min[2])) * (gridSize.nz - 1);
  return [gx, gy, gz];
}

export function gridToWorld(
  ix: number,
  iy: number,
  iz: number,
  bounds: Bounds,
  gridSize: GridSize
): [number, number, number] {
  const wx = bounds.min[0] + (ix / (gridSize.nx - 1)) * (bounds.max[0] - bounds.min[0]);
  const wy = bounds.min[1] + (iy / (gridSize.ny - 1)) * (bounds.max[1] - bounds.min[1]);
  const wz = bounds.min[2] + (iz / (gridSize.nz - 1)) * (bounds.max[2] - bounds.min[2]);
  return [wx, wy, wz];
}

export function isInBounds(pos: [number, number, number], bounds: Bounds): boolean {
  return (
    pos[0] >= bounds.min[0] && pos[0] <= bounds.max[0] &&
    pos[1] >= bounds.min[1] && pos[1] <= bounds.max[1] &&
    pos[2] >= bounds.min[2] && pos[2] <= bounds.max[2]
  );
}

export function trilinearInterpolateScalar(
  pos: [number, number, number],
  dataset: ScalarDataset
): number | null {
  if (!isInBounds(pos, dataset.bounds)) return null;

  const [gx, gy, gz] = worldToGrid(pos, dataset.bounds, dataset.gridSize);
  const { nx, ny, nz } = dataset.gridSize;

  const ix0 = clamp(Math.floor(gx), 0, nx - 2);
  const iy0 = clamp(Math.floor(gy), 0, ny - 2);
  const iz0 = clamp(Math.floor(gz), 0, nz - 2);
  const ix1 = ix0 + 1;
  const iy1 = iy0 + 1;
  const iz1 = iz0 + 1;

  const fx = gx - ix0;
  const fy = gy - iy0;
  const fz = gz - iz0;

  const v000 = dataset.values[getGridIndex(ix0, iy0, iz0, dataset.gridSize)];
  const v100 = dataset.values[getGridIndex(ix1, iy0, iz0, dataset.gridSize)];
  const v010 = dataset.values[getGridIndex(ix0, iy1, iz0, dataset.gridSize)];
  const v110 = dataset.values[getGridIndex(ix1, iy1, iz0, dataset.gridSize)];
  const v001 = dataset.values[getGridIndex(ix0, iy0, iz1, dataset.gridSize)];
  const v101 = dataset.values[getGridIndex(ix1, iy0, iz1, dataset.gridSize)];
  const v011 = dataset.values[getGridIndex(ix0, iy1, iz1, dataset.gridSize)];
  const v111 = dataset.values[getGridIndex(ix1, iy1, iz1, dataset.gridSize)];

  const v00 = lerp(v000, v100, fx);
  const v10 = lerp(v010, v110, fx);
  const v01 = lerp(v001, v101, fx);
  const v11 = lerp(v011, v111, fx);

  const v0 = lerp(v00, v10, fy);
  const v1 = lerp(v01, v11, fy);

  return lerp(v0, v1, fz);
}

export function trilinearInterpolateVector(
  pos: [number, number, number],
  dataset: VectorDataset
): [number, number, number] | null {
  if (!isInBounds(pos, dataset.bounds)) return null;

  const [gx, gy, gz] = worldToGrid(pos, dataset.bounds, dataset.gridSize);
  const { nx, ny, nz } = dataset.gridSize;

  const ix0 = clamp(Math.floor(gx), 0, nx - 2);
  const iy0 = clamp(Math.floor(gy), 0, ny - 2);
  const iz0 = clamp(Math.floor(gz), 0, nz - 2);
  const ix1 = ix0 + 1;
  const iy1 = iy0 + 1;
  const iz1 = iz0 + 1;

  const fx = gx - ix0;
  const fy = gy - iy0;
  const fz = gz - iz0;

  const v000 = dataset.values[getGridIndex(ix0, iy0, iz0, dataset.gridSize)];
  const v100 = dataset.values[getGridIndex(ix1, iy0, iz0, dataset.gridSize)];
  const v010 = dataset.values[getGridIndex(ix0, iy1, iz0, dataset.gridSize)];
  const v110 = dataset.values[getGridIndex(ix1, iy1, iz0, dataset.gridSize)];
  const v001 = dataset.values[getGridIndex(ix0, iy0, iz1, dataset.gridSize)];
  const v101 = dataset.values[getGridIndex(ix1, iy0, iz1, dataset.gridSize)];
  const v011 = dataset.values[getGridIndex(ix0, iy1, iz1, dataset.gridSize)];
  const v111 = dataset.values[getGridIndex(ix1, iy1, iz1, dataset.gridSize)];

  const result: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const lv00 = lerp(v000[i], v100[i], fx);
    const lv10 = lerp(v010[i], v110[i], fx);
    const lv01 = lerp(v001[i], v101[i], fx);
    const lv11 = lerp(v011[i], v111[i], fx);
    const lv0 = lerp(lv00, lv10, fy);
    const lv1 = lerp(lv01, lv11, fy);
    result[i] = lerp(lv0, lv1, fz);
  }
  return result;
}

export function colorLerp(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
): [number, number, number] {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

export function valueToColor(
  value: number,
  min: number,
  max: number,
  colormap: [number, number, number][]
): [number, number, number] {
  const t = clamp((value - min) / (max - min), 0, 1);
  const n = colormap.length - 1;
  const idx = Math.floor(t * n);
  const ft = t * n - idx;
  if (idx >= n) return colormap[n];
  return colorLerp(colormap[idx], colormap[idx + 1], ft);
}

export const TEMPERATURE_COLORMAP: [number, number, number][] = [
  [0x00 / 255, 0x42 / 255, 0x9d / 255],
  [0x2a / 255, 0x7a / 255, 0xff / 255],
  [0x7f / 255, 0xbf / 255, 0xff / 255],
  [0xff / 255, 0xcc / 255, 0x66 / 255],
  [0xff / 255, 0x66 / 255, 0x33 / 255],
  [0xbd / 255, 0x00 / 255, 0x26 / 255]
];

export const VELOCITY_COLORMAP: [number, number, number][] = [
  [0x33 / 255, 0xcc / 255, 0x55 / 255],
  [0x99 / 255, 0xdd / 255, 0x44 / 255],
  [0xff / 255, 0xcc / 255, 0x33 / 255],
  [0xff / 255, 0x88 / 255, 0x33 / 255],
  [0xff / 255, 0x44 / 255, 0x22 / 255]
];
