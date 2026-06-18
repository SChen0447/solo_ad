import { create } from 'zustand';
import {
  Particle,
  SimulationParams,
  SimulationStats,
  initializeParticles,
  simulateStep,
  calculateStats,
} from '../simulation/galaxyPhysics';

export interface Snapshot {
  id: string;
  timestamp: number;
  particles: Particle[];
  params: SimulationParams;
  thumbnail: string;
}

const DEFAULT_PARAMS: SimulationParams = {
  particleMass: 2.0,
  initialAngularMomentum: 1.0,
  collisionDamping: 0.3,
  darkMatterMass: 3.0,
  initialTemperature: 0.5,
  timeScale: 1.0,
};

const PARTICLE_COUNT = 5000;
const MAX_STEPS = 5000;

interface GalaxyState {
  particles: Particle[];
  params: SimulationParams;
  initialParams: SimulationParams;
  initialParticles: Particle[];
  snapshots: Snapshot[];
  isPaused: boolean;
  isComplete: boolean;
  showComplete: boolean;
  stats: SimulationStats;
  stepCount: number;
  transitionProgress: number;
  targetParticles: Particle[] | null;

  updateParams: (partialParams: Partial<SimulationParams>) => void;
  resetSimulation: () => void;
  takeSnapshot: (canvas: HTMLCanvasElement) => void;
  loadSnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;
  togglePause: () => void;
  setPaused: (paused: boolean) => void;
  stepSimulation: (dt: number) => void;
  updateTransition: (dt: number) => void;
  exportData: () => void;
  hideComplete: () => void;
}

export const useGalaxyStore = create<GalaxyState>((set, get) => {
  const initialParticles = initializeParticles(DEFAULT_PARAMS, PARTICLE_COUNT);
  const initialStats = calculateStats(initialParticles, DEFAULT_PARAMS);

  return {
    particles: initialParticles,
    params: { ...DEFAULT_PARAMS },
    initialParams: { ...DEFAULT_PARAMS },
    initialParticles: [...initialParticles],
    snapshots: [],
    isPaused: false,
    isComplete: false,
    showComplete: false,
    stats: initialStats,
    stepCount: 0,
    transitionProgress: 1,
    targetParticles: null,

    updateParams: (partialParams) => {
      const currentState = get();
      const newParams = { ...currentState.params, ...partialParams };
      const newParticles = initializeParticles(newParams, PARTICLE_COUNT);
      const newStats = calculateStats(newParticles, newParams);

      set({
        params: newParams,
        targetParticles: newParticles,
        transitionProgress: 0,
        stepCount: 0,
        isComplete: false,
        showComplete: false,
        stats: newStats,
      });
    },

    resetSimulation: () => {
      const state = get();
      const newParticles = initializeParticles(state.initialParams, PARTICLE_COUNT);
      const newStats = calculateStats(newParticles, state.initialParams);

      set({
        particles: newParticles,
        params: { ...state.initialParams },
        targetParticles: null,
        transitionProgress: 1,
        stepCount: 0,
        isPaused: false,
        isComplete: false,
        showComplete: false,
        stats: newStats,
      });
    },

    takeSnapshot: (canvas) => {
      const state = get();
      const thumbnail = canvas.toDataURL('image/png');
      const snapshot: Snapshot = {
        id: `snap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        particles: [...state.particles],
        params: { ...state.params },
        thumbnail,
      };

      set((state) => ({
        snapshots: [...state.snapshots, snapshot],
      }));
    },

    loadSnapshot: (id) => {
      const state = get();
      const snapshot = state.snapshots.find((s) => s.id === id);
      if (!snapshot) return;

      const newStats = calculateStats(snapshot.particles, snapshot.params);

      set({
        targetParticles: snapshot.particles,
        params: { ...snapshot.params },
        transitionProgress: 0,
        stepCount: 0,
        isComplete: false,
        showComplete: false,
        stats: newStats,
      });
    },

    deleteSnapshot: (id) => {
      set((state) => ({
        snapshots: state.snapshots.filter((s) => s.id !== id),
      }));
    },

    togglePause: () => {
      set((state) => ({ isPaused: !state.isPaused }));
    },

    setPaused: (paused) => {
      set({ isPaused: paused });
    },

    stepSimulation: (dt) => {
      const state = get();
      if (state.isPaused || state.isComplete || state.transitionProgress < 1) return;

      const newParticles = simulateStep(state.particles, state.params, dt);
      const newStepCount = state.stepCount + 1;
      const isComplete = newStepCount >= MAX_STEPS;
      const newStats = calculateStats(newParticles, state.params);

      set({
        particles: newParticles,
        stepCount: newStepCount,
        isComplete,
        showComplete: isComplete,
        stats: newStats,
      });

      if (isComplete) {
        setTimeout(() => {
          set({ showComplete: false });
        }, 2000);
      }
    },

    updateTransition: (dt) => {
      const state = get();
      if (state.transitionProgress >= 1 || !state.targetParticles) return;

      const transitionSpeed = 1.5;
      const newProgress = Math.min(state.transitionProgress + dt * transitionSpeed, 1);

      if (newProgress >= 1) {
        set({
          particles: state.targetParticles,
          targetParticles: null,
          transitionProgress: 1,
        });
      } else {
        const t = newProgress;
        const eased = t * t * (3 - 2 * t);
        const sourceParticles = state.particles;
        const targetParticles = state.targetParticles;

        const interpolatedParticles: Particle[] = new Array(sourceParticles.length);
        for (let i = 0; i < sourceParticles.length; i++) {
          const s = sourceParticles[i];
          const tp = targetParticles[i];
          interpolatedParticles[i] = {
            ...s,
            x: s.x + (tp.x - s.x) * eased,
            y: s.y + (tp.y - s.y) * eased,
            z: s.z + (tp.z - s.z) * eased,
            vx: s.vx + (tp.vx - s.vx) * eased,
            vy: s.vy + (tp.vy - s.vy) * eased,
            vz: s.vz + (tp.vz - s.vz) * eased,
          };
        }

        set({
          particles: interpolatedParticles,
          transitionProgress: newProgress,
        });
      }
    },

    exportData: () => {
      const state = get();
      const data = {
        params: state.params,
        stepCount: state.stepCount,
        particles: state.particles.map((p) => ({
          id: p.id,
          position: { x: p.x, y: p.y, z: p.z },
          velocity: { vx: p.vx, vy: p.vy, vz: p.vz },
          size: p.size,
        })),
        stats: state.stats,
        exportTime: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `galaxy-snapshot-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    hideComplete: () => {
      set({ showComplete: false });
    },
  };
});
