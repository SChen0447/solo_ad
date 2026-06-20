import { create } from 'zustand';
import { ParsedData, BubbleConfig, BubbleData, DEFAULT_CONFIG } from './types';

interface AppState {
  parsedData: ParsedData | null;
  config: BubbleConfig;
  selectedBubble: BubbleData | null;
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
  error: string | null;
  setParsedData: (data: ParsedData | null) => void;
  setConfig: (config: Partial<BubbleConfig>) => void;
  setSelectedBubble: (bubble: BubbleData | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentFrame: (frame: number) => void;
  setTotalFrames: (frames: number) => void;
  setError: (error: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  parsedData: null,
  config: { ...DEFAULT_CONFIG },
  selectedBubble: null,
  isPlaying: false,
  currentFrame: 0,
  totalFrames: 0,
  error: null,
  setParsedData: (data) => set({ parsedData: data }),
  setConfig: (partial) =>
    set((state) => ({ config: { ...state.config, ...partial } })),
  setSelectedBubble: (bubble) => set({ selectedBubble: bubble }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentFrame: (frame) => set({ currentFrame: frame }),
  setTotalFrames: (frames) => set({ totalFrames: frames }),
  setError: (error) => set({ error }),
}));
