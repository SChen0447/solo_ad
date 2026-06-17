export enum ModelPreset {
  Cube = 'cube',
  Icosahedron = 'icosahedron',
  TorusKnot = 'torusKnot',
  Compound = 'compound',
}

export interface TransformParams {
  translateX: number;
  rotateY: number;
  scale: number;
  shearX: number;
}

export interface TransformState {
  params: TransformParams;
  combinedMatrix: number[][];
  activeModel: ModelPreset;
  showMatrix: boolean;
  setParams: (partial: Partial<TransformParams>) => void;
  setActiveModel: (model: ModelPreset) => void;
  toggleMatrix: () => void;
}

export const DEFAULT_PARAMS: TransformParams = {
  translateX: 0,
  rotateY: 0,
  scale: 1,
  shearX: 0,
};

export const PARAM_CONFIG: Record<keyof TransformParams, { min: number; max: number; step: number; label: string }> = {
  translateX: { min: -5, max: 5, step: 0.1, label: '平移 X' },
  rotateY: { min: 0, max: 360, step: 1, label: '旋转 Y' },
  scale: { min: 0.5, max: 2, step: 0.01, label: '缩放' },
  shearX: { min: -1, max: 1, step: 0.01, label: '错切 X' },
};

export function computeCombinedMatrix(params: TransformParams): number[][] {
  const { translateX, rotateY, scale, shearX } = params;
  const rad = (rotateY * Math.PI) / 180;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);

  const shear = [
    [1, shearX, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];

  const rotation = [
    [cosR, 0, sinR, 0],
    [0, 1, 0, 0],
    [-sinR, 0, cosR, 0],
    [0, 0, 0, 1],
  ];

  const scaling = [
    [scale, 0, 0, 0],
    [0, scale, 0, 0],
    [0, 0, scale, 0],
    [0, 0, 0, 1],
  ];

  const translation = [
    [1, 0, 0, translateX],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];

  const result = multiply4(translation, multiply4(rotation, multiply4(scaling, shear)));
  return result;
}

function multiply4(a: number[][], b: number[][]): number[][] {
  const r: number[][] = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      for (let k = 0; k < 4; k++) {
        r[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return r;
}
