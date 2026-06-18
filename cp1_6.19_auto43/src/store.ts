import { create } from 'zustand';
import {
  SOURCE_POS_DEFAULT,
  MAGNITUDE_DEFAULT,
  OBSERVATION_POINTS,
  PLAYBACK_SPEEDS,
} from './config';

export interface ObservationData {
  id: string;
  displacement: number;
  stress: number;
  history: { time: number; displacement: number; stress: number }[];
}

export interface SimSnapshot {
  time: number;
  displacementField: Float32Array;
  stressField: Float32Array;
  maxDisplacement: number;
  observationData: ObservationData[];
  faultActivated: boolean;
}

export interface SeismicState {
  sourceX: number;
  sourceY: number;
  sourceZ: number;
  magnitude: number;
  isRunning: boolean;
  isPaused: boolean;
  playbackSpeed: number;
  currentTime: number;
  showFault: boolean;
  snapshot: SimSnapshot | null;
  fps: number;

  setSourceX: (v: number) => void;
  setSourceY: (v: number) => void;
  setSourceZ: (v: number) => void;
  setMagnitude: (v: number) => void;
  startSimulation: () => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  resetSimulation: () => void;
  setPlaybackSpeed: (v: number) => void;
  toggleFault: () => void;
  updateSnapshot: (snap: SimSnapshot) => void;
  setFps: (v: number) => void;
}

const createObservationData = (): ObservationData[] =>
  OBSERVATION_POINTS.map((p) => ({
    id: p.id,
    displacement: 0,
    stress: 0,
    history: [],
  }));

const initialSnapshot: SimSnapshot = {
  time: 0,
  displacementField: new Float32Array(0),
  stressField: new Float32Array(0),
  maxDisplacement: 0,
  observationData: createObservationData(),
  faultActivated: false,
};

export const useSeismicStore = create<SeismicState>((set) => ({
  sourceX: SOURCE_POS_DEFAULT.x,
  sourceY: SOURCE_POS_DEFAULT.y,
  sourceZ: SOURCE_POS_DEFAULT.z,
  magnitude: MAGNITUDE_DEFAULT,
  isRunning: false,
  isPaused: false,
  playbackSpeed: PLAYBACK_SPEEDS[2],
  currentTime: 0,
  showFault: true,
  snapshot: initialSnapshot,
  fps: 0,

  setSourceX: (v) => set({ sourceX: v }),
  setSourceY: (v) => set({ sourceY: v }),
  setSourceZ: (v) => set({ sourceZ: v }),
  setMagnitude: (v) => set({ magnitude: v }),

  startSimulation: () =>
    set({
      isRunning: true,
      isPaused: false,
      currentTime: 0,
      snapshot: {
        ...initialSnapshot,
        observationData: createObservationData(),
      },
    }),

  pauseSimulation: () => set({ isPaused: true }),
  resumeSimulation: () => set({ isPaused: false }),

  resetSimulation: () =>
    set({
      isRunning: false,
      isPaused: false,
      currentTime: 0,
      snapshot: {
        ...initialSnapshot,
        observationData: createObservationData(),
      },
    }),

  setPlaybackSpeed: (v) => set({ playbackSpeed: v }),
  toggleFault: () => set((s) => ({ showFault: !s.showFault })),
  updateSnapshot: (snap) => set({ snapshot: snap, currentTime: snap.time }),
  setFps: (v) => set({ fps: v }),
}));
