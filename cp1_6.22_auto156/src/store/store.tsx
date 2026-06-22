import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export interface ChoiceRecord {
  sceneId: string;
  choiceId: string;
  choiceText: string;
  timestamp: number;
}

export interface SaveSlot {
  id: string;
  slot: number;
  sceneId: string;
  dialogueIndex: number;
  choiceHistory: ChoiceRecord[];
  createdAt: string;
  sceneTitle: string;
}

export interface GameState {
  currentSceneId: string;
  dialogueIndex: number;
  choiceHistory: ChoiceRecord[];
  saves: (SaveSlot | null)[];
  isSettingsOpen: boolean;
  isEnding: boolean;
  endingType?: string;
  showEndingStats: boolean;
  choiceStartTime: number | null;
}

type Action =
  | { type: 'SET_SCENE'; sceneId: string; isEnding?: boolean; endingType?: string }
  | { type: 'NEXT_DIALOGUE' }
  | { type: 'SET_DIALOGUE_INDEX'; index: number }
  | { type: 'ADD_CHOICE'; choice: ChoiceRecord }
  | { type: 'TOGGLE_SETTINGS'; open?: boolean }
  | { type: 'SET_SAVES'; saves: (SaveSlot | null)[] }
  | { type: 'LOAD_SAVE'; save: SaveSlot }
  | { type: 'SHOW_ENDING_STATS' }
  | { type: 'START_CHOICE_TIMER' }
  | { type: 'RESET_GAME' };

const initialState: GameState = {
  currentSceneId: 'scene-start',
  dialogueIndex: 0,
  choiceHistory: [],
  saves: [null, null, null, null, null],
  isSettingsOpen: false,
  isEnding: false,
  endingType: undefined,
  showEndingStats: false,
  choiceStartTime: null
};

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_SCENE':
      return {
        ...state,
        currentSceneId: action.sceneId,
        dialogueIndex: 0,
        isEnding: action.isEnding || false,
        endingType: action.endingType
      };
    case 'NEXT_DIALOGUE':
      return {
        ...state,
        dialogueIndex: state.dialogueIndex + 1
      };
    case 'SET_DIALOGUE_INDEX':
      return {
        ...state,
        dialogueIndex: action.index
      };
    case 'ADD_CHOICE':
      return {
        ...state,
        choiceHistory: [...state.choiceHistory, action.choice],
        choiceStartTime: null
      };
    case 'TOGGLE_SETTINGS':
      return {
        ...state,
        isSettingsOpen: action.open !== undefined ? action.open : !state.isSettingsOpen
      };
    case 'SET_SAVES':
      return {
        ...state,
        saves: action.saves
      };
    case 'LOAD_SAVE':
      return {
        ...state,
        currentSceneId: action.save.sceneId,
        dialogueIndex: action.save.dialogueIndex,
        choiceHistory: action.save.choiceHistory as ChoiceRecord[],
        isSettingsOpen: false
      };
    case 'SHOW_ENDING_STATS':
      return {
        ...state,
        showEndingStats: true
      };
    case 'START_CHOICE_TIMER':
      return {
        ...state,
        choiceStartTime: Date.now()
      };
    case 'RESET_GAME':
      return {
        ...initialState
      };
    default:
      return state;
  }
}

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<Action>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

export function saveToLocalStorage(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
    return defaultValue;
  }
}
