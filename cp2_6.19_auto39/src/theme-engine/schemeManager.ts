import { useReducer, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ColorScheme } from './colorUtils';

export interface SchemeState {
  schemes: ColorScheme[];
  currentSchemeId: string | null;
}

type SchemeAction =
  | { type: 'ADD_SCHEME'; scheme?: Partial<ColorScheme> }
  | { type: 'DELETE_SCHEME'; id: string }
  | { type: 'SELECT_SCHEME'; id: string }
  | { type: 'UPDATE_SCHEME'; id: string; updates: Partial<ColorScheme> }
  | { type: 'REORDER_SCHEMES'; fromIndex: number; toIndex: number };

const defaultSchemes: ColorScheme[] = [
  {
    id: uuidv4(),
    name: '海洋蓝',
    primary: '#3B82F6',
    secondary: '#60A5FA',
    background: '#1E293B',
    text: '#F1F5F9',
    accent: '#06B6D4'
  },
  {
    id: uuidv4(),
    name: '森林绿',
    primary: '#10B981',
    secondary: '#34D399',
    background: '#064E3B',
    text: '#ECFDF5',
    accent: '#F59E0B'
  },
  {
    id: uuidv4(),
    name: '晚霞紫',
    primary: '#8B5CF6',
    secondary: '#A78BFA',
    background: '#1E1B4B',
    text: '#E0E7FF',
    accent: '#F472B6'
  },
  {
    id: uuidv4(),
    name: '暖阳橙',
    primary: '#F97316',
    secondary: '#FB923C',
    background: '#431407',
    text: '#FFF7ED',
    accent: '#EF4444'
  }
];

const initialState: SchemeState = {
  schemes: defaultSchemes,
  currentSchemeId: defaultSchemes[0]?.id || null
};

function schemeReducer(state: SchemeState, action: SchemeAction): SchemeState {
  switch (action.type) {
    case 'ADD_SCHEME': {
      const newScheme: ColorScheme = {
        id: uuidv4(),
        name: `方案 ${state.schemes.length + 1}`,
        primary: action.scheme?.primary || '#6366F1',
        secondary: action.scheme?.secondary || '#818CF8',
        background: action.scheme?.background || '#1E1E2E',
        text: action.scheme?.text || '#F8FAFC',
        accent: action.scheme?.accent || '#F43F5E',
        ...action.scheme
      };
      return {
        ...state,
        schemes: [...state.schemes, newScheme],
        currentSchemeId: newScheme.id
      };
    }
    case 'DELETE_SCHEME': {
      const filtered = state.schemes.filter(s => s.id !== action.id);
      const currentDeleted = state.currentSchemeId === action.id;
      return {
        ...state,
        schemes: filtered,
        currentSchemeId: currentDeleted
          ? filtered[0]?.id || null
          : state.currentSchemeId
      };
    }
    case 'SELECT_SCHEME': {
      return {
        ...state,
        currentSchemeId: action.id
      };
    }
    case 'UPDATE_SCHEME': {
      return {
        ...state,
        schemes: state.schemes.map(s =>
          s.id === action.id ? { ...s, ...action.updates } : s
        )
      };
    }
    case 'REORDER_SCHEMES': {
      const { fromIndex, toIndex } = action;
      const result = [...state.schemes];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return {
        ...state,
        schemes: result
      };
    }
    default:
      return state;
  }
}

export function useSchemeManager() {
  const [state, dispatch] = useReducer(schemeReducer, initialState);

  const currentScheme = state.schemes.find(
    s => s.id === state.currentSchemeId
  ) || null;

  const addScheme = useCallback((scheme?: Partial<ColorScheme>) => {
    dispatch({ type: 'ADD_SCHEME', scheme });
  }, []);

  const deleteScheme = useCallback((id: string) => {
    dispatch({ type: 'DELETE_SCHEME', id });
  }, []);

  const selectScheme = useCallback((id: string) => {
    dispatch({ type: 'SELECT_SCHEME', id });
  }, []);

  const updateScheme = useCallback((id: string, updates: Partial<ColorScheme>) => {
    dispatch({ type: 'UPDATE_SCHEME', id, updates });
  }, []);

  const reorderSchemes = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: 'REORDER_SCHEMES', fromIndex, toIndex });
  }, []);

  return {
    schemes: state.schemes,
    currentScheme,
    currentSchemeId: state.currentSchemeId,
    addScheme,
    deleteScheme,
    selectScheme,
    updateScheme,
    reorderSchemes
  };
}
