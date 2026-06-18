import { create } from 'zustand';
import {
  EvolutionStage,
  StarPhysicsState,
  calculateStarState,
  getStageFromTimeline,
  getEvolutionTimeline
} from '../physics/starEvolution';

type TimeSpeed = 1 | 3 | 10;

interface StarStoreState {
  mass: number;
  evolutionProgress: number;
  stage: EvolutionStage;
  stageProgress: number;
  isPlaying: boolean;
  timeSpeed: TimeSpeed;
  physicsState: StarPhysicsState;
  showInfoCard: boolean;
  currentInfoStage: EvolutionStage | null;
  setMass: (mass: number) => void;
  setStage: (stage: EvolutionStage) => void;
  setEvolutionProgress: (progress: number) => void;
  startEvolution: () => void;
  pauseEvolution: () => void;
  togglePlay: () => void;
  setTimeSpeed: (speed: TimeSpeed) => void;
  tick: (deltaTime: number) => void;
  showStageInfo: (stage: EvolutionStage) => void;
  hideInfoCard: () => void;
}

function updatePhysicsState(mass: number, progress: number): { physicsState: StarPhysicsState; stage: EvolutionStage; stageProgress: number } {
  const { stage, stageProgress } = getStageFromTimeline(mass, progress);
  const physicsState = calculateStarState(mass, stage, stageProgress);
  return { physicsState, stage, stageProgress };
}

export const useStarStore = create<StarStoreState>((set, get) => {
  const initialMass = 1;
  const initialProgress = 0.1;
  const initial = updatePhysicsState(initialMass, initialProgress);

  return {
    mass: initialMass,
    evolutionProgress: initialProgress,
    stage: initial.stage,
    stageProgress: initial.stageProgress,
    isPlaying: false,
    timeSpeed: 1,
    physicsState: initial.physicsState,
    showInfoCard: false,
    currentInfoStage: null,

    setMass: (mass: number) => {
      const clampedMass = Math.max(0.5, Math.min(50, mass));
      const { physicsState, stage, stageProgress } = updatePhysicsState(clampedMass, get().evolutionProgress);
      set({ mass: clampedMass, physicsState, stage, stageProgress });
    },

    setStage: (stage: EvolutionStage) => {
      const timeline = getEvolutionTimeline(get().mass);
      const stageInfo = timeline.find(t => t.stage === stage);
      if (stageInfo) {
        const midProgress = (stageInfo.start + stageInfo.end) / 2;
        const { physicsState, stageProgress } = updatePhysicsState(get().mass, midProgress);
        set({ evolutionProgress: midProgress, stage, stageProgress, physicsState });
      }
    },

    setEvolutionProgress: (progress: number) => {
      const clampedProgress = Math.max(0, Math.min(1, progress));
      const { physicsState, stage, stageProgress } = updatePhysicsState(get().mass, clampedProgress);
      set({ evolutionProgress: clampedProgress, physicsState, stage, stageProgress });
    },

    startEvolution: () => set({ isPlaying: true }),

    pauseEvolution: () => set({ isPlaying: false }),

    togglePlay: () => set({ isPlaying: !get().isPlaying }),

    setTimeSpeed: (speed: TimeSpeed) => set({ timeSpeed: speed }),

    tick: (deltaTime: number) => {
      const { isPlaying, timeSpeed, evolutionProgress, mass } = get();
      if (!isPlaying) return;

      const speedMultiplier = 0.01 * timeSpeed;
      const newProgress = evolutionProgress + deltaTime * speedMultiplier;

      if (newProgress >= 1) {
        set({ isPlaying: false, evolutionProgress: 1 });
        const final = updatePhysicsState(mass, 1);
        set(final);
      } else {
        const { physicsState, stage, stageProgress } = updatePhysicsState(mass, newProgress);
        const prevStage = get().stage;
        if (stage !== prevStage) {
          set({
            evolutionProgress: newProgress,
            physicsState,
            stage,
            stageProgress,
            showInfoCard: true,
            currentInfoStage: stage
          });
        } else {
          set({ evolutionProgress: newProgress, physicsState, stage, stageProgress });
        }
      }
    },

    showStageInfo: (stage: EvolutionStage) => {
      set({ showInfoCard: true, currentInfoStage: stage });
    },

    hideInfoCard: () => {
      set({ showInfoCard: false, currentInfoStage: null });
    }
  };
});
