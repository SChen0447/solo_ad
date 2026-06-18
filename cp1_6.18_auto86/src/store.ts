import { create } from 'zustand';
import type { GameState, ScoreState } from './types';

interface GameStore extends GameState, ScoreState {
  setPhase: (phase: GameState['phase']) => void;
  setCountdown: (value: number) => void;
  setCurrentTime: (time: number) => void;
  setFps: (fps: number) => void;
  setParticleCount: (n: number) => void;
  addPerfect: () => void;
  addGood: () => void;
  addMiss: () => void;
  resetScore: () => void;
}

const initialScore: ScoreState = {
  score: 100,
  combo: 0,
  maxCombo: 0,
  total: 0,
  hits: 0,
  perfectCount: 0,
  goodCount: 0,
  missCount: 0
};

const initialGame: GameState = {
  phase: 'idle',
  countdownValue: 3,
  currentTime: 0,
  levelDuration: 30000,
  fps: 60,
  particleCount: 100
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialGame,
  ...initialScore,

  setPhase: (phase) => set({ phase }),
  setCountdown: (value) => set({ countdownValue: value }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setFps: (fps) => set({ fps }),
  setParticleCount: (n) => set({ particleCount: n }),

  addPerfect: () => {
    const s = get();
    const newCombo = s.combo + 1;
    set({
      score: s.score + 10,
      combo: newCombo,
      maxCombo: Math.max(s.maxCombo, newCombo),
      total: s.total + 1,
      hits: s.hits + 1,
      perfectCount: s.perfectCount + 1
    });
  },

  addGood: () => {
    const s = get();
    const newCombo = s.combo + 1;
    set({
      score: s.score + 5,
      combo: newCombo,
      maxCombo: Math.max(s.maxCombo, newCombo),
      total: s.total + 1,
      hits: s.hits + 1,
      goodCount: s.goodCount + 1
    });
  },

  addMiss: () => {
    const s = get();
    set({
      combo: 0,
      total: s.total + 1,
      missCount: s.missCount + 1
    });
  },

  resetScore: () => {
    set({ ...initialScore, currentTime: 0 });
  }
}));
