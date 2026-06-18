import {
  Vector3,
  WaveFrontData,
  Sensor,
  P_WAVE_SPEED,
  S_WAVE_SPEED,
  SENSOR_COUNT
} from './types';

export function calculateDistance(a: Vector3, b: Vector3): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2) +
    Math.pow(a.z - b.z, 2)
  );
}

export function calculatePWaveArrivalTime(epicenter: Vector3, sensorPos: Vector3): number {
  const distance = calculateDistance(epicenter, sensorPos);
  return distance / P_WAVE_SPEED;
}

export function calculateSWaveArrivalTime(epicenter: Vector3, sensorPos: Vector3): number {
  const distance = calculateDistance(epicenter, sensorPos);
  return distance / S_WAVE_SPEED;
}

export function getWaveFrontData(time: number, epicenter: Vector3): WaveFrontData {
  return {
    pWaveRadius: Math.max(0, time * P_WAVE_SPEED),
    sWaveRadius: Math.max(0, time * S_WAVE_SPEED),
    time,
    epicenter
  };
}

export function generateSensors(epicenter: Vector3): Sensor[] {
  const sensors: Sensor[] = [];
  for (let i = 0; i < SENSOR_COUNT; i++) {
    const x = (Math.random() - 0.5) * 18;
    const y = (Math.random() - 0.5) * 4;
    const z = (Math.random() - 0.5) * 18;
    const position: Vector3 = { x, y, z };
    const lat = 30 + (y / 5) * 10;
    const lon = 100 + (x / 20) * 20;
    sensors.push({
      id: i,
      position,
      pWaveArrivalTime: calculatePWaveArrivalTime(epicenter, position),
      sWaveArrivalTime: calculateSWaveArrivalTime(epicenter, position),
      peakAmplitude: Math.random() * 0.8 + 0.2,
      lat,
      lon
    });
  }
  return sensors;
}

export function isPWaveReached(time: number, epicenter: Vector3, sensorPos: Vector3): boolean {
  return time >= calculatePWaveArrivalTime(epicenter, sensorPos);
}

export function isSWaveReached(time: number, epicenter: Vector3, sensorPos: Vector3): boolean {
  return time >= calculateSWaveArrivalTime(epicenter, sensorPos);
}

export function getSensorColumnHeight(time: number, sensor: Sensor): number {
  if (time < sensor.pWaveArrivalTime) return 0;
  const maxHeight = 5;
  const progress = Math.min(1, (time - sensor.pWaveArrivalTime) / 2);
  const baseHeight = progress * maxHeight * sensor.peakAmplitude;
  const sWaveBoost = time >= sensor.sWaveArrivalTime
    ? maxHeight * (1 - sensor.peakAmplitude) * 0.5
    : 0;
  return baseHeight + sWaveBoost;
}
