import { create } from 'zustand';
import { Room, User, Line, RoomPhase } from './types';
import { WebSocketManager } from './WebSocketManager';

interface AppState {
  currentUser: User | null;
  room: Room | null;
  ws: WebSocketManager | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  displayedScenePrompt: string;

  setCurrentUser: (user: User) => void;
  setRoom: (room: Room) => void;
  setConnectionStatus: (status: 'disconnected' | 'connecting' | 'connected') => void;
  setWs: (ws: WebSocketManager) => void;
  setDisplayedScenePrompt: (prompt: string) => void;
  addLine: (line: Line) => void;
  updateCountdown: (value: number) => void;
  setCurrentTurn: (userId: string | null, round: number, turnIndex: number) => void;
  setPhase: (phase: RoomPhase) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  room: null,
  ws: null,
  connectionStatus: 'disconnected',
  displayedScenePrompt: '',

  setCurrentUser: (user) => set({ currentUser: user }),

  setRoom: (room) => set({ room }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setWs: (ws) => set({ ws }),

  setDisplayedScenePrompt: (prompt) => set({ displayedScenePrompt: prompt }),

  addLine: (line) =>
    set((state) => {
      if (!state.room) return state;
      return {
        room: {
          ...state.room,
          lines: [...state.room.lines, line],
        },
      };
    }),

  updateCountdown: (value) =>
    set((state) => {
      if (!state.room) return state;
      return {
        room: {
          ...state.room,
          countdown: value,
        },
      };
    }),

  setCurrentTurn: (userId, round, turnIndex) =>
    set((state) => {
      if (!state.room) return state;
      return {
        room: {
          ...state.room,
          currentTurnUserId: userId,
          currentRound: round,
          turnIndex: turnIndex,
        },
      };
    }),

  setPhase: (phase) =>
    set((state) => {
      if (!state.room) return state;
      return {
        room: {
          ...state.room,
          phase,
        },
      };
    }),

  reset: () =>
    set({
      currentUser: null,
      room: null,
      ws: null,
      connectionStatus: 'disconnected',
      displayedScenePrompt: '',
    }),
}));
