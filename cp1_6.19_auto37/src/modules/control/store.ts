import { create } from 'zustand';
import { FaultParams, MeasurementPoint, CrackSegment } from '../geology/types';
import { GeologySimulator } from '../geology/GeologySimulator';

interface HistoryRecord {
  time: number;
  displacement: number;
  stress: number;
  energy: number;
}

interface SimulationStore {
  time: number;
  isPlaying: boolean;
  playbackSpeed: number;
  faultParams: FaultParams;
  measurementPoints: MeasurementPoint[];
  userMeasurementPoints: MeasurementPoint[];
  cracks: CrackSegment[];
  displacementHistory: Record<string, HistoryRecord[]>;
  simulator: GeologySimulator;
  panelCollapsed: boolean;

  setTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setFaultParams: (params: Partial<FaultParams>) => void;
  setMeasurementPoints: (points: MeasurementPoint[]) => void;
  addUserMeasurementPoint: (point: MeasurementPoint) => void;
  removeUserMeasurementPoint: (id: string) => void;
  setCracks: (cracks: CrackSegment[]) => void;
  recordHistory: (time: number) => void;
  resetSimulation: () => void;
  setPanelCollapsed: (collapsed: boolean) => void;
  tick: (delta: number) => void;
}

const createSimulator = (faultParams?: Partial<FaultParams>) => {
  return new GeologySimulator(faultParams);
};

const defaultSimulator = createSimulator();
const defaultPoints = defaultSimulator.generateDefaultMeasurementPoints();

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  time: 0,
  isPlaying: false,
  playbackSpeed: 1,
  faultParams: defaultSimulator.faultParams,
  measurementPoints: defaultPoints,
  userMeasurementPoints: [],
  cracks: [],
  displacementHistory: {},
  simulator: defaultSimulator,
  panelCollapsed: false,

  setTime: (time: number) => {
    const clampedTime = Math.max(0, Math.min(50, time));
    const sim = get().simulator;
    const allPoints = [...get().measurementPoints, ...get().userMeasurementPoints];
    const updatedPoints = sim.updateMeasurementPoints(allPoints, clampedTime);
    const updatedDefault = updatedPoints.filter(p => !p.isUserAdded);
    const updatedUser = updatedPoints.filter(p => p.isUserAdded);
    const cracks = sim.detectCracks(clampedTime);
    set({ time: clampedTime, measurementPoints: updatedDefault, userMeasurementPoints: updatedUser, cracks });
  },

  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),

  togglePlay: () => set(state => ({ isPlaying: !state.isPlaying })),

  setPlaybackSpeed: (speed: number) => set({ playbackSpeed: speed }),

  setFaultParams: (params: Partial<FaultParams>) => {
    const currentParams = get().faultParams;
    const newParams = { ...currentParams, ...params };
    const newSimulator = createSimulator(newParams);
    const newPoints = newSimulator.generateDefaultMeasurementPoints();
    set({
      faultParams: newParams,
      simulator: newSimulator,
      measurementPoints: newPoints,
      userMeasurementPoints: [],
      cracks: [],
      displacementHistory: {},
      time: 0,
      isPlaying: false,
    });
  },

  setMeasurementPoints: (points: MeasurementPoint[]) => set({ measurementPoints: points }),

  addUserMeasurementPoint: (point: MeasurementPoint) => {
    const current = get().userMeasurementPoints;
    if (current.length + get().measurementPoints.length >= 20) return;
    set({ userMeasurementPoints: [...current, point] });
  },

  removeUserMeasurementPoint: (id: string) => {
    set(state => ({
      userMeasurementPoints: state.userMeasurementPoints.filter(p => p.id !== id),
    }));
  },

  setCracks: (cracks: CrackSegment[]) => set({ cracks }),

  recordHistory: (time: number) => {
    const state = get();
    const allPoints = [...state.measurementPoints, ...state.userMeasurementPoints];
    const newHistory = { ...state.displacementHistory };
    for (const point of allPoints) {
      if (!newHistory[point.id]) newHistory[point.id] = [];
      const last = newHistory[point.id][newHistory[point.id].length - 1];
      if (last && Math.abs(last.time - time) < 0.3) continue;
      newHistory[point.id] = [
        ...newHistory[point.id],
        { time, displacement: point.displacement, stress: point.stress, energy: point.energy },
      ];
    }
    set({ displacementHistory: newHistory });
  },

  resetSimulation: () => {
    const newSimulator = createSimulator(get().faultParams);
    const newPoints = newSimulator.generateDefaultMeasurementPoints();
    set({
      time: 0,
      isPlaying: false,
      simulator: newSimulator,
      measurementPoints: newPoints,
      userMeasurementPoints: [],
      cracks: [],
      displacementHistory: {},
    });
  },

  setPanelCollapsed: (collapsed: boolean) => set({ panelCollapsed: collapsed }),

  tick: (delta: number) => {
    const state = get();
    if (!state.isPlaying) return;
    const newTime = Math.min(50, state.time + delta * state.playbackSpeed);
    const sim = state.simulator;
    const allPoints = [...state.measurementPoints, ...state.userMeasurementPoints];
    const updatedPoints = sim.updateMeasurementPoints(allPoints, newTime);
    const updatedDefault = updatedPoints.filter(p => !p.isUserAdded);
    const updatedUser = updatedPoints.filter(p => p.isUserAdded);
    const cracks = sim.detectCracks(newTime);

    const newHistory = { ...state.displacementHistory };
    for (const point of allPoints) {
      if (!newHistory[point.id]) newHistory[point.id] = [];
      const arr = newHistory[point.id];
      const last = arr[arr.length - 1];
      if (!last || Math.abs(last.time - newTime) >= 0.3) {
        newHistory[point.id] = [...arr, { time: newTime, displacement: point.displacement, stress: point.stress, energy: point.energy }];
      }
    }

    set({
      time: newTime,
      measurementPoints: updatedDefault,
      userMeasurementPoints: updatedUser,
      cracks,
      displacementHistory: newHistory,
      isPlaying: newTime < 50,
    });
  },
}));
