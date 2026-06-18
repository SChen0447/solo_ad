import { create } from 'zustand';
import {
  generateMaze,
  getRoomCoordinates,
  type CellType,
  type BeamNode,
} from './MazeGenerator';

interface PlayerState {
  position: { x: number; y: number; z: number };
  yaw: number;
  roomX: number;
  roomZ: number;
}

interface BeamAnimation {
  globalHueShift: number;
  targetHueShift: number;
  hueTransitionStart: number;
  hueTransitionProgress: number;
  brightnessPhase: number;
  isTransitioning: boolean;
  transitionPhase: 'fadeOut' | 'fadeIn' | 'idle';
  transitionProgress: number;
  pendingBeams: BeamNode[] | null;
}

interface MazeStore {
  maze: CellType[][];
  beams: BeamNode[];
  player: PlayerState;
  animation: BeamAnimation;
  isComplete: boolean;
  time: number;
  lastColorWaveTime: number;
  lastMazeRegenTime: number;

  generateNewMaze: () => void;
  updatePlayerPosition: (x: number, z: number, yaw: number) => void;
  updateAnimation: (delta: number) => void;
  triggerColorWave: () => void;
  setComplete: (complete: boolean) => void;
  resetPlayer: () => void;
  startMazeTransition: () => void;
}

const INITIAL_PLAYER: PlayerState = {
  position: { x: 0, y: 1.5, z: 0 },
  yaw: 0,
  roomX: 0,
  roomZ: 0,
};

const INITIAL_ANIMATION: BeamAnimation = {
  globalHueShift: 0,
  targetHueShift: 0,
  hueTransitionStart: 0,
  hueTransitionProgress: 1,
  brightnessPhase: 0,
  isTransitioning: false,
  transitionPhase: 'idle',
  transitionProgress: 0,
  pendingBeams: null,
};

const initialMaze = generateMaze();

export const useMazeStore = create<MazeStore>((set, get) => ({
  maze: initialMaze.maze,
  beams: initialMaze.beams,
  player: INITIAL_PLAYER,
  animation: INITIAL_ANIMATION,
  isComplete: false,
  time: 0,
  lastColorWaveTime: 0,
  lastMazeRegenTime: 0,

  generateNewMaze: () => {
    const { maze, beams } = generateMaze();
    set({ maze, beams });
  },

  updatePlayerPosition: (x: number, z: number, yaw: number) => {
    const { roomX, roomZ } = getRoomCoordinates(x, z);
    set((state) => ({
      player: {
        ...state.player,
        position: { ...state.player.position, x, z },
        yaw,
        roomX,
        roomZ,
      },
    }));
  },

  updateAnimation: (delta: number) => {
    const state = get();
    const newTime = state.time + delta;

    let newAnimation = { ...state.animation };

    newAnimation.brightnessPhase =
      (newAnimation.brightnessPhase + delta) % 3;

    if (newAnimation.hueTransitionProgress < 1) {
      newAnimation.hueTransitionProgress = Math.min(
        1,
        newAnimation.hueTransitionProgress + delta / 2
      );
      const t = newAnimation.hueTransitionProgress;
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      newAnimation.globalHueShift =
        newAnimation.hueTransitionStart +
        (newAnimation.targetHueShift - newAnimation.hueTransitionStart) * eased;
    }

    if (newAnimation.isTransitioning) {
      newAnimation.transitionProgress += delta / 1.5;

      if (
        newAnimation.transitionPhase === 'fadeOut' &&
        newAnimation.transitionProgress >= 1
      ) {
        newAnimation.transitionPhase = 'fadeIn';
        newAnimation.transitionProgress = 0;
        if (newAnimation.pendingBeams) {
          set({ beams: newAnimation.pendingBeams });
          newAnimation.pendingBeams = null;
        }
        get().resetPlayer();
      } else if (
        newAnimation.transitionPhase === 'fadeIn' &&
        newAnimation.transitionProgress >= 1
      ) {
        newAnimation.isTransitioning = false;
        newAnimation.transitionPhase = 'idle';
        newAnimation.transitionProgress = 0;
      }
      set({ lastMazeRegenTime: newTime });
    }

    let newLastColorWaveTime = state.lastColorWaveTime;
    if (newTime - state.lastColorWaveTime >= 10 && !newAnimation.isTransitioning) {
      get().triggerColorWave();
      newLastColorWaveTime = newTime;
    }

    set({
      time: newTime,
      animation: newAnimation,
      lastColorWaveTime: newLastColorWaveTime,
    });
  },

  triggerColorWave: () => {
    set((state) => ({
      animation: {
        ...state.animation,
        hueTransitionStart: state.animation.globalHueShift,
        targetHueShift: state.animation.globalHueShift + 30,
        hueTransitionProgress: 0,
      },
    }));
  },

  setComplete: (complete: boolean) => {
    set({ isComplete: complete });
  },

  resetPlayer: () => {
    set({ player: { ...INITIAL_PLAYER } });
  },

  startMazeTransition: () => {
    const { maze, beams } = generateMaze();
    set((state) => ({
      maze,
      animation: {
        ...state.animation,
        isTransitioning: true,
        transitionPhase: 'fadeOut',
        transitionProgress: 0,
        pendingBeams: beams,
      },
    }));
  },
}));
