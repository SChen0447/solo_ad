export interface BezierCurve {
  p1x: number;
  p1y: number;
  p2x: number;
  p2y: number;
}

export type AnimationType = 'translate' | 'scale' | 'rotate' | 'opacity';

export interface PresetCurve {
  name: string;
  label: string;
  curve: BezierCurve;
}

export const PRESET_CURVES: PresetCurve[] = [
  {
    name: 'ease',
    label: 'ease',
    curve: { p1x: 0.25, p1y: 0.1, p2x: 0.25, p2y: 1 }
  },
  {
    name: 'ease-in',
    label: 'ease-in',
    curve: { p1x: 0.42, p1y: 0, p2x: 1, p2y: 1 }
  },
  {
    name: 'ease-out',
    label: 'ease-out',
    curve: { p1x: 0, p1y: 0, p2x: 0.58, p2y: 1 }
  },
  {
    name: 'ease-in-out',
    label: 'ease-in-out',
    curve: { p1x: 0.42, p1y: 0, p2x: 0.58, p2y: 1 }
  },
  {
    name: 'linear',
    label: 'linear',
    curve: { p1x: 0, p1y: 0, p2x: 1, p2y: 1 }
  },
  {
    name: 'custom',
    label: '自定义',
    curve: { p1x: 0.25, p1y: 0.1, p2x: 0.25, p2y: 1 }
  }
];
