import { create } from 'zustand';
import type { AppState, TimerState, StretchAction, PostureTip, HistoryRecord } from '@/types';
import { FOCUS_DURATION, REST_DURATION, POSTURE_TIPS } from '@/types';
import { loadHistory, saveHistory, incrementTodaySession } from '@/utils/storage';

interface AppStore extends AppState {
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  tick: () => void;
  togglePostureMode: () => void;
  setCurrentAction: (action: StretchAction) => void;
  setShowRestModal: (show: boolean) => void;
  setShowHistoryPanel: (show: boolean) => void;
  completeFocusSession: () => void;
  startRestPhase: () => void;
  cyclePostureTip: () => void;
}

const initialTimerState: TimerState = {
  phase: 'idle',
  isRunning: false,
  timeRemaining: FOCUS_DURATION,
  duration: FOCUS_DURATION,
};

export const useAppStore = create<AppStore>((set, get) => ({
  timer: initialTimerState,
  postureMode: false,
  currentAction: 'idle',
  showRestModal: false,
  showHistoryPanel: false,
  history: loadHistory(),
  currentTip: POSTURE_TIPS[0],

  startTimer: () =>
    set((state) => ({
      timer: {
        ...state.timer,
        isRunning: true,
        phase: state.timer.phase === 'idle' ? 'focus' : state.timer.phase,
      },
    })),

  pauseTimer: () =>
    set((state) => ({
      timer: { ...state.timer, isRunning: false },
    })),

  resetTimer: () =>
    set({
      timer: initialTimerState,
    }),

  tick: () =>
    set((state) => {
      if (!state.timer.isRunning || state.timer.timeRemaining <= 0) return state;

      const newTimeRemaining = state.timer.timeRemaining - 0.1;

      if (newTimeRemaining <= 0) {
        return {
          timer: {
            ...state.timer,
            timeRemaining: 0,
            isRunning: false,
          },
        };
      }

      return {
        timer: {
          ...state.timer,
          timeRemaining: newTimeRemaining,
        },
      };
    }),

  togglePostureMode: () =>
    set((state) => ({
      postureMode: !state.postureMode,
      currentAction: !state.postureMode ? 'idle' : state.currentAction,
    })),

  setCurrentAction: (action: StretchAction) => set({ currentAction: action }),

  setShowRestModal: (show: boolean) => set({ showRestModal: show }),

  setShowHistoryPanel: (show: boolean) => set({ showHistoryPanel: show }),

  completeFocusSession: () => {
    const { history } = get();
    const updatedHistory = incrementTodaySession(history);
    saveHistory(updatedHistory);
    set({ history: updatedHistory });
  },

  startRestPhase: () =>
    set({
      timer: {
        phase: 'rest',
        isRunning: true,
        timeRemaining: REST_DURATION,
        duration: REST_DURATION,
      },
      showRestModal: false,
      currentAction: 'idle',
    }),

  cyclePostureTip: () => {
    const { currentTip } = get();
    const currentIndex = POSTURE_TIPS.indexOf(currentTip);
    const nextIndex = (currentIndex + 1) % POSTURE_TIPS.length;
    set({ currentTip: POSTURE_TIPS[nextIndex] });
  },
}));
