export type ColorBlindType = 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

export const COLOR_BLIND_LABELS: Record<ColorBlindType, string> = {
  protanopia: '红色盲',
  deuteranopia: '绿色盲',
  tritanopia: '蓝色盲',
  achromatopsia: '全色盲',
};

export const COLOR_BLIND_MATRICES: Record<ColorBlindType, number[][]> = {
  protanopia: [
    [0.56667, 0.43333, 0.0],
    [0.55833, 0.44167, 0.0],
    [0.0, 0.24167, 0.75833],
  ],
  deuteranopia: [
    [0.625, 0.375, 0.0],
    [0.7, 0.3, 0.0],
    [0.0, 0.3, 0.7],
  ],
  tritanopia: [
    [0.95, 0.05, 0.0],
    [0.0, 0.43333, 0.56667],
    [0.0, 0.475, 0.525],
  ],
  achromatopsia: [
    [0.2126, 0.7152, 0.0722],
    [0.2126, 0.7152, 0.0722],
    [0.2126, 0.7152, 0.0722],
  ],
};

export function applyColorBlindMatrix(
  r: number,
  g: number,
  b: number,
  type: ColorBlindType
): [number, number, number] {
  const matrix = COLOR_BLIND_MATRICES[type];
  const nr = matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b;
  const ng = matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b;
  const nb = matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b;
  return [
    Math.min(255, Math.max(0, Math.round(nr))),
    Math.min(255, Math.max(0, Math.round(ng))),
    Math.min(255, Math.max(0, Math.round(nb))),
  ];
}
