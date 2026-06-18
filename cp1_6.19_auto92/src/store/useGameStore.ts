import { create } from 'zustand';

interface GameStore {
  isRunning: boolean;
  gameTime: number;
  speedMultiplier: number;
  toggleRunning: () => void;
  setRunning: (running: boolean) => void;
  skipTime: (seconds: number) => void;
  incrementGameTime: (seconds: number) => void;
  setSpeedMultiplier: (multiplier: number) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  isRunning: true,
  gameTime: 0,
  speedMultiplier: 1,
  
  toggleRunning: () => {
    set((state) => ({ isRunning: !state.isRunning }));
  },
  
  setRunning: (running: boolean) => {
    set({ isRunning: running });
  },
  
  skipTime: (seconds: number) => {
    set((state) => ({ gameTime: state.gameTime + seconds }));
  },
  
  incrementGameTime: (seconds: number) => {
    const state = get();
    if (state.isRunning) {
      set({ gameTime: state.gameTime + seconds });
    }
  },
  
  setSpeedMultiplier: (multiplier: number) => {
    set({ speedMultiplier: multiplier });
  },
}));
