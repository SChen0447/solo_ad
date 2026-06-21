import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import type { Track, Note, Review, Theme, AppState, ActionType } from './types';
import { generateId, createAudioContext } from './utils';

interface HistoryState {
  past: AppState[];
  present: AppState;
  future: AppState[];
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<ActionType | { type: 'UNDO' } | { type: 'REDO' }>;
  addTrack: (file: File) => Promise<string>;
  undo: () => void;
  redo: () => void;
  toggleTheme: () => void;
  getAudioContext: () => AudioContext;
}

const AppContext = createContext<AppContextType | null>(null);

const initialState: AppState = {
  tracks: [],
  currentTrackId: null,
  isPlaying: false,
  currentTime: 0,
  volume: 0.7,
  notes: [],
  reviews: [],
  currentReviewId: null,
  theme: 'dark',
};

function appReducer(state: AppState, action: ActionType): AppState {
  switch (action.type) {
    case 'ADD_TRACK':
      return { ...state, tracks: [...state.tracks, action.payload] };
    case 'SET_CURRENT_TRACK':
      return { ...state, currentTrackId: action.payload, currentTime: 0, isPlaying: false };
    case 'SET_AUDIO_BUFFER':
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.payload.trackId
            ? { ...t, audioBuffer: action.payload.buffer, duration: action.payload.buffer.duration }
            : t
        ),
      };
    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: action.payload ?? !state.isPlaying };
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    case 'ADD_NOTE':
      return { ...state, notes: [...state.notes, action.payload] };
    case 'UPDATE_NOTE':
      return {
        ...state,
        notes: state.notes.map((n) => (n.id === action.payload.id ? action.payload : n)),
      };
    case 'DELETE_NOTE':
      return { ...state, notes: state.notes.filter((n) => n.id !== action.payload) };
    case 'ADD_REVIEW':
      return { ...state, reviews: [...state.reviews, action.payload] };
    case 'UPDATE_REVIEW':
      return {
        ...state,
        reviews: state.reviews.map((r) => (r.id === action.payload.id ? action.payload : r)),
      };
    case 'DELETE_REVIEW':
      return { ...state, reviews: state.reviews.filter((r) => r.id !== action.payload) };
    case 'SET_CURRENT_REVIEW':
      return { ...state, currentReviewId: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    default:
      return state;
  }
}

const HISTORY_ACTIONS = new Set([
  'ADD_NOTE', 'UPDATE_NOTE', 'DELETE_NOTE',
  'ADD_REVIEW', 'UPDATE_REVIEW', 'DELETE_REVIEW',
]);

function createHistoryState(present: AppState): HistoryState {
  return { past: [], present, future: [] };
}

function historyReducer(
  state: HistoryState,
  action: ActionType | { type: 'UNDO' } | { type: 'REDO' }
): HistoryState {
  if (action.type === 'UNDO') {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, -1);
    return { past: newPast, present: previous, future: [state.present, ...state.future] };
  }

  if (action.type === 'REDO') {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    return { past: [...state.past, state.present], present: next, future: newFuture };
  }

  const nextPresent = appReducer(state.present, action as ActionType);
  if (nextPresent === state.present) return state;

  if (HISTORY_ACTIONS.has(action.type)) {
    return {
      past: [...state.past, state.present],
      present: nextPresent,
      future: [],
    };
  }

  return { ...state, present: nextPresent };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, dispatch] = useReducer(historyReducer, createHistoryState(initialState));
  const { present: state } = history;
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          dispatch({ type: 'REDO' });
        } else {
          dispatch({ type: 'UNDO' });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext();
    }
    return audioContextRef.current;
  }, []);

  const addTrack = useCallback(
    async (file: File) => {
      const url = URL.createObjectURL(file);
      const track: Track = {
        id: generateId(),
        name: file.name,
        file,
        url,
        duration: 0,
        audioBuffer: null,
      };
      dispatch({ type: 'ADD_TRACK', payload: track });

      try {
        const audioCtx = getAudioContext();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        dispatch({ type: 'SET_AUDIO_BUFFER', payload: { trackId: track.id, buffer: audioBuffer } });
      } catch (err) {
        console.error('Failed to decode audio:', err);
      }

      return track.id;
    },
    [getAudioContext]
  );

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const toggleTheme = useCallback(() => {
    dispatch({ type: 'SET_THEME', payload: state.theme === 'dark' ? 'light' : 'dark' });
  }, [state.theme]);

  return (
    <AppContext.Provider
      value={{ state, dispatch, addTrack, undo, redo, toggleTheme, getAudioContext }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
