export type WaveType = 'P' | 'S';

export type DisplayMode = 'wavefront' | 'rays' | 'both';

export type ViewMode = 'top' | 'side' | 'cross' | 'global';

export interface EarthLayer {
  name: string;
  innerRadius: number;
  outerRadius: number;
  pWaveSpeed: number;
  sWaveSpeed: number;
  color: string;
}

export interface Hypocenter {
  latitude: number;
  longitude: number;
  depth: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Wavefront {
  id: string;
  type: WaveType;
  center: Vector3;
  radius: number;
  opacity: number;
  isSecondary: boolean;
  layerIndex: number;
}

export interface RayPoint {
  position: Vector3;
  time: number;
  waveSpeed: number;
}

export interface RayPath {
  id: string;
  type: WaveType;
  points: RayPoint[];
  receiverIndex: number;
  arrived: boolean;
  arrivalTime: number;
}

export interface ReceiverPoint {
  index: number;
  position: Vector3;
  latitude: number;
  longitude: number;
  pWaveArrived: boolean;
  sWaveArrived: boolean;
  flashTime: number;
}

export interface SimulationStats {
  simulationTime: number;
  pWaveMaxDistance: number;
  sWaveMaxDistance: number;
  arrivedReceiversCount: number;
  totalTime: number;
  averagePSpeed: number;
  averageSSpeed: number;
  isRunning: boolean;
  isFinished: boolean;
}

export interface SeismicState {
  hypocenter: Hypocenter;
  displayMode: DisplayMode;
  viewMode: ViewMode;
  waveTypes: Record<WaveType, boolean>;
  isSimulating: boolean;
  stats: SimulationStats;
  wavefronts: Wavefront[];
  rays: RayPath[];
  receivers: ReceiverPoint[];
  setHypocenter: (h: Partial<Hypocenter>) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleWaveType: (type: WaveType) => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
  updateSimulation: (deltaTime: number) => void;
}
