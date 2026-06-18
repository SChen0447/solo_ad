export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface WaveFrontData {
  pWaveRadius: number;
  sWaveRadius: number;
  time: number;
  epicenter: Vector3;
}

export interface Sensor {
  id: number;
  position: Vector3;
  pWaveArrivalTime: number;
  sWaveArrivalTime: number;
  peakAmplitude: number;
  lat: number;
  lon: number;
}

export type WaveType = 'P' | 'S';

export interface AlertEvent {
  id: string;
  sensorId: number;
  waveType: WaveType;
  arrivalTime: number;
  timestamp: number;
}

export interface EpicenterOption {
  id: string;
  name: string;
  position: Vector3;
}

export const EPICENTER_OPTIONS: EpicenterOption[] = [
  { id: 'center', name: '中心', position: { x: 0, y: 0, z: 0 } },
  { id: 'left-front-top', name: '左前上', position: { x: -8, y: 2, z: -8 } },
  { id: 'right-back-bottom', name: '右后下', position: { x: 8, y: -2, z: 8 } }
];

export const P_WAVE_SPEED = 6;
export const S_WAVE_SPEED = 3.5;
export const MAX_TIME = 30;
export const SENSOR_COUNT = 200;
