export interface FaultParams {
  strike: number;
  dipDirection: number;
  dipAngle: number;
  slipDirection: number;
  maxDisplacement: number;
}

export interface LayerConfig {
  color: string;
  thickness: number;
  baseHeight: number;
}

export interface MeasurementPoint {
  id: string;
  position: [number, number, number];
  displacement: number;
  stress: number;
  energy: number;
  isUserAdded: boolean;
  createdAt: number;
  side: 'hanging' | 'footwall';
}

export interface CrackSegment {
  start: [number, number, number];
  end: [number, number, number];
}

export interface SimState {
  time: number;
  faultParams: FaultParams;
  layers: LayerConfig[];
  measurementPoints: MeasurementPoint[];
  cracks: CrackSegment[];
  displacementHistory: Record<string, { time: number; displacement: number; stress: number; energy: number }[]>;
  isPlaying: boolean;
  playbackSpeed: number;
}

export interface VertexDeformation {
  original: [number, number, number];
  deformed: [number, number, number];
  displacement: number;
}
