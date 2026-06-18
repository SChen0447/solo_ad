export interface WheelParams {
  wheelId: string;
  color: string;
  size: number;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}

export interface WheelPreset {
  id: string;
  name: string;
  modelPath: string;
  spokes: number;
  type: 'classic' | 'sport' | 'cross' | 'dense' | 'concept';
}

export interface WheelPosition {
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
}

export type ComparisonSide = 'left' | 'right' | 'single';

export interface AppState {
  selectedCarId: string;
  leftWheelParams: WheelParams;
  rightWheelParams: WheelParams;
  wheelHistory: string[];
  comparisonMode: boolean;
  cameraState: CameraState;
  loadingWheels: Set<string>;
  activeSide: ComparisonSide;

  setWheelParams: (side: 'left' | 'right', params: Partial<WheelParams>) => void;
  selectWheel: (wheelId: string) => void;
  setColor: (color: string) => void;
  setSize: (size: number) => void;
  toggleComparisonMode: () => void;
  setCameraState: (state: CameraState) => void;
  setWheelLoaded: (wheelId: string, loaded: boolean) => void;
  setActiveSide: (side: ComparisonSide) => void;
}

export const WHEEL_PRESETS: WheelPreset[] = [
  { id: 'wheel1', name: '经典五辐', modelPath: '/models/wheels/wheel1.glb', spokes: 5, type: 'classic' },
  { id: 'wheel2', name: '运动双辐', modelPath: '/models/wheels/wheel2.glb', spokes: 10, type: 'sport' },
  { id: 'wheel3', name: '交叉辐', modelPath: '/models/wheels/wheel3.glb', spokes: 12, type: 'cross' },
  { id: 'wheel4', name: '密辐式', modelPath: '/models/wheels/wheel4.glb', spokes: 20, type: 'dense' },
  { id: 'wheel5', name: '概念碟形', modelPath: '/models/wheels/wheel5.glb', spokes: 0, type: 'concept' },
];

export const COLOR_PRESETS: string[] = [
  '#c0c0c0',
  '#a0a0a0',
  '#808080',
  '#606060',
  '#404040',
  '#2a2a2a',
  '#1a1a1a',
  '#8b7355',
  '#b8860b',
  '#ffd700',
];

export const SIZE_RANGE = { min: 17, max: 22, step: 1 };

export const WHEEL_POSITIONS: WheelPosition[] = [
  { name: 'frontLeft', position: [-1.2, 0.4, 1.8], rotation: [0, 0, 0] },
  { name: 'frontRight', position: [1.2, 0.4, 1.8], rotation: [0, Math.PI, 0] },
  { name: 'rearLeft', position: [-1.2, 0.4, -1.8], rotation: [0, 0, 0] },
  { name: 'rearRight', position: [1.2, 0.4, -1.8], rotation: [0, Math.PI, 0] },
];

export const DEFAULT_CAMERA_STATE: CameraState = {
  position: [0, 1.5, 6],
  target: [0, 0.5, 0],
};

export const DEFAULT_WHEEL_PARAMS: WheelParams = {
  wheelId: 'wheel1',
  color: COLOR_PRESETS[0],
  size: 19,
};
