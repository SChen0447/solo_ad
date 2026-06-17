export interface ControlPoint {
  x: number;
  y: number;
  z: number;
}

export interface TubeParams {
  radius: number;
  tubularSegments: number;
  radialSegments: number;
  color: string;
  uvTiling: number;
}

export interface CurveData {
  id: string;
  name: string;
  controlPoints: ControlPoint[];
  params: TubeParams;
}

export interface SceneData {
  version: string;
  curves: CurveData[];
  exportTime: string;
}

export const DEFAULT_TUBE_PARAMS: TubeParams = {
  radius: 0.3,
  tubularSegments: 12,
  radialSegments: 12,
  color: '#c0c0c0',
  uvTiling: 1
};

export const MAX_CURVES = 10;
export const MAX_CONTROL_POINTS = 20;
