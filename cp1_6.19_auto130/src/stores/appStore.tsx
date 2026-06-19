import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import type { Palette, MoodBoard, Color, HistoryItem, MoodBoardItem, BackgroundTexture } from '../types/colors';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  currentPalette: Palette | null;
  palettes: Palette[];
  moodBoards: MoodBoard[];
  activeMoodBoardId: string | null;
  history: HistoryItem[];
  extractedColors: Color[];
  isExtracting: boolean;
  isHistoryOpen: boolean;
}

type Action =
  | { type: 'SET_CURRENT_PALETTE'; payload: Palette | null }
  | { type: 'SET_PALETTES'; payload: Palette[] }
  | { type: 'ADD_PALETTE'; payload: Palette }
  | { type: 'ADD_MOOD_BOARD'; payload: MoodBoard }
  | { type: 'UPDATE_MOOD_BOARD'; payload: MoodBoard }
  | { type: 'DELETE_MOOD_BOARD'; payload: string }
  | { type: 'SET_ACTIVE_MOOD_BOARD'; payload: string | null }
  | { type: 'ADD_TO_HISTORY'; payload: Palette }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'SET_EXTRACTED_COLORS'; payload: Color[] }
  | { type: 'SET_IS_EXTRACTING'; payload: boolean }
  | { type: 'TOGGLE_HISTORY' }
  | { type: 'ADD_ITEM_TO_MOOD_BOARD'; payload: { boardId: string; item: MoodBoardItem } }
  | { type: 'UPDATE_MOOD_BOARD_ITEM'; payload: { boardId: string; itemId: string; updates: Partial<MoodBoardItem> } }
  | { type: 'REMOVE_ITEM_FROM_MOOD_BOARD'; payload: { boardId: string; itemId: string } }
  | { type: 'SET_MOOD_BOARD_BACKGROUND'; payload: { boardId: string; background: BackgroundTexture; color: string } };

const initialState: AppState = {
  currentPalette: null,
  palettes: [],
  moodBoards: [],
  activeMoodBoardId: null,
  history: [],
  extractedColors: [],
  isExtracting: false,
  isHistoryOpen: false,
};

const MAX_HISTORY = 20;

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_CURRENT_PALETTE':
      return { ...state, currentPalette: action.payload };
    case 'SET_PALETTES':
      return { ...state, palettes: action.payload };
    case 'ADD_PALETTE':
      return { ...state, palettes: [...state.palettes, action.payload] };
    case 'ADD_MOOD_BOARD':
      return { ...state, moodBoards: [...state.moodBoards, action.payload] };
    case 'UPDATE_MOOD_BOARD':
      return {
        ...state,
        moodBoards: state.moodBoards.map((board) =>
          board.id === action.payload.id ? action.payload : board
        ),
      };
    case 'DELETE_MOOD_BOARD':
      return {
        ...state,
        moodBoards: state.moodBoards.filter((board) => board.id !== action.payload),
        activeMoodBoardId: state.activeMoodBoardId === action.payload ? null : state.activeMoodBoardId,
      };
    case 'SET_ACTIVE_MOOD_BOARD':
      return { ...state, activeMoodBoardId: action.payload };
    case 'ADD_TO_HISTORY': {
      const newHistory = [
        { id: uuidv4(), palette: action.payload, timestamp: Date.now() },
        ...state.history,
      ].slice(0, MAX_HISTORY);
      return { ...state, history: newHistory };
    }
    case 'CLEAR_HISTORY':
      return { ...state, history: [] };
    case 'SET_EXTRACTED_COLORS':
      return { ...state, extractedColors: action.payload };
    case 'SET_IS_EXTRACTING':
      return { ...state, isExtracting: action.payload };
    case 'TOGGLE_HISTORY':
      return { ...state, isHistoryOpen: !state.isHistoryOpen };
    case 'ADD_ITEM_TO_MOOD_BOARD': {
      return {
        ...state,
        moodBoards: state.moodBoards.map((board) =>
          board.id === action.payload.boardId
            ? { ...board, items: [...board.items, action.payload.item], updatedAt: Date.now() }
            : board
        ),
      };
    }
    case 'UPDATE_MOOD_BOARD_ITEM': {
      return {
        ...state,
        moodBoards: state.moodBoards.map((board) =>
          board.id === action.payload.boardId
            ? {
                ...board,
                items: board.items.map((item) =>
                  item.id === action.payload.itemId
                    ? { ...item, ...action.payload.updates }
                    : item
                ),
                updatedAt: Date.now(),
              }
            : board
        ),
      };
    }
    case 'REMOVE_ITEM_FROM_MOOD_BOARD': {
      return {
        ...state,
        moodBoards: state.moodBoards.map((board) =>
          board.id === action.payload.boardId
            ? {
                ...board,
                items: board.items.filter((item) => item.id !== action.payload.itemId),
                updatedAt: Date.now(),
              }
            : board
        ),
      };
    }
    case 'SET_MOOD_BOARD_BACKGROUND': {
      return {
        ...state,
        moodBoards: state.moodBoards.map((board) =>
          board.id === action.payload.boardId
            ? {
                ...board,
                background: action.payload.background,
                backgroundColor: action.payload.color,
                updatedAt: Date.now(),
              }
            : board
        ),
      };
    }
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  setCurrentPalette: (palette: Palette | null) => void;
  setPalettes: (palettes: Palette[]) => void;
  addPalette: (palette: Palette) => void;
  addMoodBoard: (name: string) => void;
  updateMoodBoard: (board: MoodBoard) => void;
  deleteMoodBoard: (id: string) => void;
  setActiveMoodBoard: (id: string | null) => void;
  addToHistory: (palette: Palette) => void;
  clearHistory: () => void;
  setExtractedColors: (colors: Color[]) => void;
  setIsExtracting: (value: boolean) => void;
  toggleHistory: () => void;
  addItemToMoodBoard: (boardId: string, item: MoodBoardItem) => void;
  updateMoodBoardItem: (boardId: string, itemId: string, updates: Partial<MoodBoardItem>) => void;
  removeItemFromMoodBoard: (boardId: string, itemId: string) => void;
  setMoodBoardBackground: (boardId: string, background: BackgroundTexture, color: string) => void;
  createColorItem: (color: Color, x: number, y: number) => MoodBoardItem;
  createTextItem: (text: string, x: number, y: number) => MoodBoardItem;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setCurrentPalette = useCallback((palette: Palette | null) => {
    dispatch({ type: 'SET_CURRENT_PALETTE', payload: palette });
  }, []);

  const setPalettes = useCallback((palettes: Palette[]) => {
    dispatch({ type: 'SET_PALETTES', payload: palettes });
  }, []);

  const addPalette = useCallback((palette: Palette) => {
    dispatch({ type: 'ADD_PALETTE', payload: palette });
  }, []);

  const addMoodBoard = useCallback((name: string) => {
    const newBoard: MoodBoard = {
      id: uuidv4(),
      name,
      items: [],
      background: 'solid',
      backgroundColor: '#ffffff',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    dispatch({ type: 'ADD_MOOD_BOARD', payload: newBoard });
  }, []);

  const updateMoodBoard = useCallback((board: MoodBoard) => {
    dispatch({ type: 'UPDATE_MOOD_BOARD', payload: board });
  }, []);

  const deleteMoodBoard = useCallback((id: string) => {
    dispatch({ type: 'DELETE_MOOD_BOARD', payload: id });
  }, []);

  const setActiveMoodBoard = useCallback((id: string | null) => {
    dispatch({ type: 'SET_ACTIVE_MOOD_BOARD', payload: id });
  }, []);

  const addToHistory = useCallback((palette: Palette) => {
    dispatch({ type: 'ADD_TO_HISTORY', payload: palette });
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_HISTORY' });
  }, []);

  const setExtractedColors = useCallback((colors: Color[]) => {
    dispatch({ type: 'SET_EXTRACTED_COLORS', payload: colors });
  }, []);

  const setIsExtracting = useCallback((value: boolean) => {
    dispatch({ type: 'SET_IS_EXTRACTING', payload: value });
  }, []);

  const toggleHistory = useCallback(() => {
    dispatch({ type: 'TOGGLE_HISTORY' });
  }, []);

  const addItemToMoodBoard = useCallback((boardId: string, item: MoodBoardItem) => {
    dispatch({ type: 'ADD_ITEM_TO_MOOD_BOARD', payload: { boardId, item } });
  }, []);

  const updateMoodBoardItem = useCallback(
    (boardId: string, itemId: string, updates: Partial<MoodBoardItem>) => {
      dispatch({ type: 'UPDATE_MOOD_BOARD_ITEM', payload: { boardId, itemId, updates } });
    },
    []
  );

  const removeItemFromMoodBoard = useCallback((boardId: string, itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM_FROM_MOOD_BOARD', payload: { boardId, itemId } });
  }, []);

  const setMoodBoardBackground = useCallback(
    (boardId: string, background: BackgroundTexture, color: string) => {
      dispatch({ type: 'SET_MOOD_BOARD_BACKGROUND', payload: { boardId, background, color } });
    },
    []
  );

  const createColorItem = useCallback((color: Color, x: number, y: number): MoodBoardItem => {
    return {
      id: uuidv4(),
      type: 'color',
      x,
      y,
      color,
    };
  }, []);

  const createTextItem = useCallback((text: string, x: number, y: number): MoodBoardItem => {
    return {
      id: uuidv4(),
      type: 'text',
      x,
      y,
      text,
      fontSize: 16,
      fontFamily: 'sans-serif',
      textColor: '#000000',
    };
  }, []);

  const value: AppContextType = {
    state,
    setCurrentPalette,
    setPalettes,
    addPalette,
    addMoodBoard,
    updateMoodBoard,
    deleteMoodBoard,
    setActiveMoodBoard,
    addToHistory,
    clearHistory,
    setExtractedColors,
    setIsExtracting,
    toggleHistory,
    addItemToMoodBoard,
    updateMoodBoardItem,
    removeItemFromMoodBoard,
    setMoodBoardBackground,
    createColorItem,
    createTextItem,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}
