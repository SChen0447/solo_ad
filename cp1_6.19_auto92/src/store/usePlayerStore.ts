import { create } from 'zustand';
import { PlayerState } from '../modules/player/types';
import { playerStateManager } from '../modules/player/playerState';

interface PlayerStore {
  playerState: PlayerState;
  init: () => void;
  restoreHealth: (amount: number) => void;
  restoreHunger: (amount: number) => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  playerState: playerStateManager.getState(),
  init: () => {
    playerStateManager.subscribe((state) => {
      set({ playerState: state });
    });
  },
  restoreHealth: (amount: number) => {
    playerStateManager.restoreHealth(amount);
  },
  restoreHunger: (amount: number) => {
    playerStateManager.restoreHunger(amount);
  },
}));
