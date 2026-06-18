import { create } from 'zustand';
import {
  Vector3,
  WaveFrontData,
  AlertEvent,
  Sensor,
  EPICENTER_OPTIONS,
  P_WAVE_SPEED,
  S_WAVE_SPEED,
  MAX_TIME,
  SENSOR_COUNT
} from './types';

function generateSensors(epicenter: Vector3): Sensor[] {
  const sensors: Sensor[] = [];
  for (let i = 0; i < SENSOR_COUNT; i++) {
    const x = (Math.random() - 0.5) * 18;
    const y = (Math.random() - 0.5) * 4;
    const z = (Math.random() - 0.5) * 18;
    const distance = Math.sqrt(
      Math.pow(x - epicenter.x, 2) +
      Math.pow(y - epicenter.y, 2) +
      Math.pow(z - epicenter.z, 2)
    );
    const lat = 30 + (y / 5) * 10;
    const lon = 100 + (x / 20) * 20;
    sensors.push({
      id: i,
      position: { x, y, z },
      pWaveArrivalTime: distance / P_WAVE_SPEED,
      sWaveArrivalTime: distance / S_WAVE_SPEED,
      peakAmplitude: Math.random() * 0.8 + 0.2,
      lat,
      lon
    });
  }
  return sensors;
}

interface SeismicStore {
  time: number;
  setTime: (time: number) => void;
  isPlaying: boolean;
  togglePlaying: () => void;
  setPlaying: (playing: boolean) => void;
  epicenterId: string;
  setEpicenter: (epicenterId: string) => void;
  getEpicenter: () => Vector3;
  getWaveFrontData: () => WaveFrontData;
  sensors: Sensor[];
  alerts: AlertEvent[];
  addAlert: (alert: Omit<AlertEvent, 'id' | 'timestamp'>) => void;
  selectedSensor: Sensor | null;
  setSelectedSensor: (sensor: Sensor | null) => void;
  hoverPosition: { x: number; y: number } | null;
  setHoverPosition: (pos: { x: number; y: number } | null) => void;
  triggerAlertCheck: (currentTime: number) => void;
  reset: () => void;
}

export const useSeismicStore = create<SeismicStore>((set, get) => {
  const initialEpicenterId = 'center';
  const initialEpicenter = EPICENTER_OPTIONS.find(e => e.id === initialEpicenterId)!.position;
  const initialSensors = generateSensors(initialEpicenter);

  return {
    time: 0,
    setTime: (time) => {
      const clampedTime = Math.max(0, Math.min(MAX_TIME, time));
      set({ time: clampedTime });
      get().triggerAlertCheck(clampedTime);
    },
    isPlaying: false,
    togglePlaying: () => set({ isPlaying: !get().isPlaying }),
    setPlaying: (playing) => set({ isPlaying: playing }),
    epicenterId: initialEpicenterId,
    setEpicenter: (epicenterId) => {
      const option = EPICENTER_OPTIONS.find(e => e.id === epicenterId);
      if (option) {
        const newSensors = generateSensors(option.position);
        set({
          epicenterId,
          time: 0,
          isPlaying: false,
          sensors: newSensors,
          alerts: []
        });
      }
    },
    getEpicenter: () => {
      const option = EPICENTER_OPTIONS.find(e => e.id === get().epicenterId);
      return option ? option.position : { x: 0, y: 0, z: 0 };
    },
    getWaveFrontData: () => {
      const state = get();
      return {
        pWaveRadius: state.time * P_WAVE_SPEED,
        sWaveRadius: state.time * S_WAVE_SPEED,
        time: state.time,
        epicenter: state.getEpicenter()
      };
    },
    sensors: initialSensors,
    alerts: [],
    addAlert: (alert) => {
      const newAlert: AlertEvent = {
        ...alert,
        id: `${alert.sensorId}-${alert.waveType}-${alert.arrivalTime}-${Date.now()}`,
        timestamp: Date.now()
      };
      set((state) => {
        const existing = state.alerts.find(
          a => a.sensorId === alert.sensorId && a.waveType === alert.waveType
        );
        if (existing) return state;
        const updated = [newAlert, ...state.alerts];
        return { alerts: updated };
      });
    },
    selectedSensor: null,
    setSelectedSensor: (sensor) => set({ selectedSensor: sensor }),
    hoverPosition: null,
    setHoverPosition: (pos) => set({ hoverPosition: pos }),
    triggerAlertCheck: (currentTime) => {
      const state = get();
      state.sensors.forEach(sensor => {
        if (sensor.pWaveArrivalTime <= currentTime && sensor.pWaveArrivalTime > 0) {
          if (Math.abs(sensor.pWaveArrivalTime - currentTime) < 0.1 || currentTime >= sensor.pWaveArrivalTime) {
            state.addAlert({
              sensorId: sensor.id,
              waveType: 'P',
              arrivalTime: sensor.pWaveArrivalTime
            });
          }
        }
        if (sensor.sWaveArrivalTime <= currentTime && sensor.sWaveArrivalTime > 0) {
          if (Math.abs(sensor.sWaveArrivalTime - currentTime) < 0.1 || currentTime >= sensor.sWaveArrivalTime) {
            state.addAlert({
              sensorId: sensor.id,
              waveType: 'S',
              arrivalTime: sensor.sWaveArrivalTime
            });
          }
        }
      });
    },
    reset: () => {
      set({
        time: 0,
        isPlaying: false,
        alerts: [],
        selectedSensor: null,
        hoverPosition: null
      });
    }
  };
});
