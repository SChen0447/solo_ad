import { create } from 'zustand';
import { StoryRecord, SceneData } from './types';

interface AppState {
  currentStory: string;
  displayedStory: string;
  isGenerating: boolean;
  generationProgress: number;
  modelLoadingState: 'idle' | 'loading' | 'ready' | 'error';
  modelLoadingProgress: number;
  currentTheme: string | null;
  storyHistory: StoryRecord[];
  sceneData: SceneData | null;
  selectedText: string;
  selectionPosition: { x: number; y: number } | null;
  isSpeaking: boolean;
  speakingCharIndex: number;
  activeThemeId: string | null;

  setCurrentStory: (story: string) => void;
  setDisplayedStory: (story: string) => void;
  appendDisplayedChar: (char: string) => void;
  setIsGenerating: (v: boolean) => void;
  setGenerationProgress: (v: number) => void;
  setModelLoadingState: (v: 'idle' | 'loading' | 'ready' | 'error') => void;
  setModelLoadingProgress: (v: number) => void;
  setCurrentTheme: (v: string | null) => void;
  setActiveThemeId: (v: string | null) => void;
  addStoryToHistory: (story: StoryRecord) => void;
  setSceneData: (v: SceneData | null) => void;
  setSelectedText: (v: string) => void;
  setSelectionPosition: (v: { x: number; y: number } | null) => void;
  setIsSpeaking: (v: boolean) => void;
  setSpeakingCharIndex: (v: number) => void;
  resetGeneration: () => void;
}

const loadHistory = (): StoryRecord[] => {
  try {
    const data = localStorage.getItem('story_history');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveHistory = (history: StoryRecord[]) => {
  localStorage.setItem('story_history', JSON.stringify(history.slice(0, 5)));
};

export const useAppStore = create<AppState>((set) => ({
  currentStory: '',
  displayedStory: '',
  isGenerating: false,
  generationProgress: 0,
  modelLoadingState: 'idle',
  modelLoadingProgress: 0,
  currentTheme: null,
  storyHistory: loadHistory(),
  sceneData: null,
  selectedText: '',
  selectionPosition: null,
  isSpeaking: false,
  speakingCharIndex: -1,
  activeThemeId: null,

  setCurrentStory: (story) => set({ currentStory: story }),
  setDisplayedStory: (story) => set({ displayedStory: story }),
  appendDisplayedChar: (char) =>
    set((state) => ({ displayedStory: state.displayedStory + char })),
  setIsGenerating: (v) => set({ isGenerating: v }),
  setGenerationProgress: (v) => set({ generationProgress: v }),
  setModelLoadingState: (v) => set({ modelLoadingState: v }),
  setModelLoadingProgress: (v) => set({ modelLoadingProgress: v }),
  setCurrentTheme: (v) => set({ currentTheme: v }),
  setActiveThemeId: (v) => set({ activeThemeId: v }),
  addStoryToHistory: (story) =>
    set((state) => {
      const history = [story, ...state.storyHistory.filter((s) => s.id !== story.id)].slice(0, 5);
      saveHistory(history);
      return { storyHistory: history };
    }),
  setSceneData: (v) => set({ sceneData: v }),
  setSelectedText: (v) => set({ selectedText: v }),
  setSelectionPosition: (v) => set({ selectionPosition: v }),
  setIsSpeaking: (v) => set({ isSpeaking: v }),
  setSpeakingCharIndex: (v) => set({ speakingCharIndex: v }),
  resetGeneration: () =>
    set({
      currentStory: '',
      displayedStory: '',
      isGenerating: false,
      generationProgress: 0,
    }),
}));
