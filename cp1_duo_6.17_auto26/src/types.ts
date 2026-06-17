export interface GridSize {
  nx: number;
  ny: number;
  nz: number;
}

export interface Bounds {
  min: [number, number, number];
  max: [number, number, number];
}

export interface ScalarDataset {
  gridSize: GridSize;
  bounds: Bounds;
  type: 'scalar';
  field: string;
  isovalues?: number[];
  values: number[];
}

export interface VectorDataset {
  gridSize: GridSize;
  bounds: Bounds;
  type: 'vector';
  field: string;
  values: [number, number, number][];
}

export type Dataset = ScalarDataset | VectorDataset;
