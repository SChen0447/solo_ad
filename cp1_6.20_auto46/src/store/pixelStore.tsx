import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export const CANVAS_SIZE = 16;
export const MAX_HISTORY = 50;
export const DEFAULT_FRAME_DELAY = 100;
export const RECOMMENDED_TAGS = ['动物', '人物', '场景', 'UI图标', '像素字体', '其他'];

export interface PixelFrame {
  id: string;
  pixels: string[];
  delay: number;
}

export interface Artwork {
  id: string;
  title: string;
  tags: string[];
  frames: PixelFrame[];
  author: string;
  createdAt: number;
  thumbnail: string;
}

export type PixelAction =
  | { type: 'SET_PIXEL'; x: number; y: number; color: string }
  | { type: 'SET_CURRENT_COLOR'; color: string }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'ADD_FRAME' }
  | { type: 'DELETE_FRAME'; frameId: string }
  | { type: 'SET_CURRENT_FRAME'; frameIndex: number }
  | { type: 'MOVE_FRAME'; fromIndex: number; toIndex: number }
  | { type: 'SET_FRAME_DELAY'; frameId: string; delay: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR_CANVAS' }
  | { type: 'SET_PLAYING'; playing: boolean }
  | { type: 'SET_PLAYBACK_SPEED'; speed: number }
  | { type: 'NEXT_FRAME' }
  | { type: 'LOAD_ARTWORK'; frames: PixelFrame[] }
  | { type: 'RESET_CANVAS' };

interface HistoryState {
  past: PixelFrame[][];
  future: PixelFrame[][];
}

export interface PixelState {
  frames: PixelFrame[];
  currentFrameIndex: number;
  currentColor: string;
  zoom: number;
  isPlaying: boolean;
  playbackSpeed: number;
  history: HistoryState;
}

function createEmptyPixels(): string[] {
  return new Array(CANVAS_SIZE * CANVAS_SIZE).fill('transparent');
}

function createFrame(): PixelFrame {
  return {
    id: `frame-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    pixels: createEmptyPixels(),
    delay: DEFAULT_FRAME_DELAY,
  };
}

const initialFrame = createFrame();

const initialState: PixelState = {
  frames: [initialFrame],
  currentFrameIndex: 0,
  currentColor: '#000000',
  zoom: 2,
  isPlaying: false,
  playbackSpeed: 1,
  history: {
    past: [],
    future: [],
  },
};

function deepCloneFrames(frames: PixelFrame[]): PixelFrame[] {
  return frames.map(f => ({
    ...f,
    pixels: [...f.pixels],
  }));
}

function pixelReducer(state: PixelState, action: PixelAction): PixelState {
  switch (action.type) {
    case 'SET_PIXEL': {
      const newFrames = deepCloneFrames(state.frames);
      const frame = newFrames[state.currentFrameIndex];
      const index = action.y * CANVAS_SIZE + action.x;
      frame.pixels[index] = action.color;

      const newPast = [...state.history.past, state.frames];
      if (newPast.length > MAX_HISTORY) {
        newPast.shift();
      }

      return {
        ...state,
        frames: newFrames,
        history: {
          past: newPast,
          future: [],
        },
      };
    }

    case 'SET_CURRENT_COLOR':
      return { ...state, currentColor: action.color };

    case 'SET_ZOOM':
      return { ...state, zoom: action.zoom };

    case 'ADD_FRAME': {
      const newFrame = createFrame();
      const newFrames = [...state.frames, newFrame];
      const newPast = [...state.history.past, state.frames];
      if (newPast.length > MAX_HISTORY) newPast.shift();

      return {
        ...state,
        frames: newFrames,
        currentFrameIndex: newFrames.length - 1,
        history: {
          past: newPast,
          future: [],
        },
      };
    }

    case 'DELETE_FRAME': {
      if (state.frames.length <= 1) return state;
      const newFrames = state.frames.filter(f => f.id !== action.frameId);
      let newIndex = state.currentFrameIndex;
      if (newIndex >= newFrames.length) {
        newIndex = newFrames.length - 1;
      }
      const newPast = [...state.history.past, state.frames];
      if (newPast.length > MAX_HISTORY) newPast.shift();

      return {
        ...state,
        frames: newFrames,
        currentFrameIndex: newIndex,
        history: {
          past: newPast,
          future: [],
        },
      };
    }

    case 'SET_CURRENT_FRAME':
      return { ...state, currentFrameIndex: action.frameIndex };

    case 'MOVE_FRAME': {
      const newFrames = deepCloneFrames(state.frames);
      const [removed] = newFrames.splice(action.fromIndex, 1);
      newFrames.splice(action.toIndex, 0, removed);
      const newPast = [...state.history.past, state.frames];
      if (newPast.length > MAX_HISTORY) newPast.shift();

      return {
        ...state,
        frames: newFrames,
        currentFrameIndex: action.toIndex,
        history: {
          past: newPast,
          future: [],
        },
      };
    }

    case 'SET_FRAME_DELAY': {
      const newFrames = deepCloneFrames(state.frames);
      const frame = newFrames.find(f => f.id === action.frameId);
      if (frame) {
        frame.delay = action.delay;
      }
      return { ...state, frames: newFrames };
    }

    case 'UNDO': {
      if (state.history.past.length === 0) return state;
      const newPast = [...state.history.past];
      const previous = newPast.pop()!;
      const newFuture = [state.frames, ...state.history.future];

      return {
        ...state,
        frames: previous,
        currentFrameIndex: Math.min(state.currentFrameIndex, previous.length - 1),
        history: {
          past: newPast,
          future: newFuture,
        },
      };
    }

    case 'REDO': {
      if (state.history.future.length === 0) return state;
      const newFuture = [...state.history.future];
      const next = newFuture.shift()!;
      const newPast = [...state.history.past, state.frames];

      return {
        ...state,
        frames: next,
        currentFrameIndex: Math.min(state.currentFrameIndex, next.length - 1),
        history: {
          past: newPast,
          future: newFuture,
        },
      };
    }

    case 'CLEAR_CANVAS': {
      const newFrames = deepCloneFrames(state.frames);
      newFrames[state.currentFrameIndex].pixels = createEmptyPixels();
      const newPast = [...state.history.past, state.frames];
      if (newPast.length > MAX_HISTORY) newPast.shift();

      return {
        ...state,
        frames: newFrames,
        history: {
          past: newPast,
          future: [],
        },
      };
    }

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.playing };

    case 'SET_PLAYBACK_SPEED':
      return { ...state, playbackSpeed: action.speed };

    case 'NEXT_FRAME': {
      const nextIndex = (state.currentFrameIndex + 1) % state.frames.length;
      return { ...state, currentFrameIndex: nextIndex };
    }

    case 'LOAD_ARTWORK': {
      return {
        ...state,
        frames: deepCloneFrames(action.frames),
        currentFrameIndex: 0,
        history: {
          past: [],
          future: [],
        },
        isPlaying: false,
      };
    }

    case 'RESET_CANVAS': {
      const newFrame = createFrame();
      return {
        ...initialState,
        frames: [newFrame],
      };
    }

    default:
      return state;
  }
}

const PixelContext = createContext<{
  state: PixelState;
  dispatch: React.Dispatch<PixelAction>;
} | null>(null);

export function PixelProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(pixelReducer, initialState);

  return (
    <PixelContext.Provider value={{ state, dispatch }}>
      {children}
    </PixelContext.Provider>
  );
}

export function usePixel() {
  const context = useContext(PixelContext);
  if (!context) {
    throw new Error('usePixel must be used within a PixelProvider');
  }
  return context;
}
