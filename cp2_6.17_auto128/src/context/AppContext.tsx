import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { faker } from '@faker-js/faker';
import type {
  AppState,
  AppAction,
  Excerpt,
  Workbench,
  Tag,
  TagColor,
  Annotation,
  ColumnType,
} from '../types';

const TAG_COLORS: TagColor[] = ['red', 'orange', 'green', 'blue', 'purple', 'gray'];

const generateMockTags = (count: number): Tag[] => {
  const tagNames = ['灵感', '设计', '技术', '产品', '阅读', '待办'];
  return tagNames.slice(0, count).map((name, i) => ({
    id: uuidv4(),
    name,
    color: TAG_COLORS[i % TAG_COLORS.length],
  }));
};

const generateMockExcerpts = (): Excerpt[] => {
  const excerpts: Excerpt[] = [];
  const types: Array<'text' | 'image' | 'video'> = ['text', 'image', 'video'];

  for (let i = 0; i < 15; i++) {
    const type = types[i % 3];
    const tags = generateMockTags(Math.floor(Math.random() * 3) + 1);
    const annotations: Annotation[] = [];

    if (Math.random() > 0.5) {
      annotations.push({
        id: uuidv4(),
        content: faker.lorem.sentence(),
        createdAt: Date.now() - Math.random() * 86400000,
      });
    }

    excerpts.push({
      id: uuidv4(),
      type,
      title: faker.lorem.sentence({ min: 5, max: 12 }),
      content: type === 'text'
        ? faker.lorem.paragraph({ min: 2, max: 5 })
        : type === 'image'
        ? `https://picsum.photos/600/${400 + i * 20}`
        : 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      sourceUrl: faker.internet.url(),
      createdAt: Date.now() - i * 3600000 * Math.random() * 24,
      tags,
      annotations,
      relatedCardIds: [],
    });
  }

  return excerpts.sort((a, b) => b.createdAt - a.createdAt);
};

const createDefaultWorkbenches = (excerptIds: string[]): Workbench[] => {
  const todoIds = excerptIds.slice(0, 5);
  const processingIds = excerptIds.slice(5, 8);
  const doneIds = excerptIds.slice(8, 10);

  return [
    {
      id: uuidv4(),
      name: '方案A',
      columns: [
        { id: 'todo', title: '待整理', cardIds: todoIds },
        { id: 'processing', title: '加工中', cardIds: processingIds },
        { id: 'done', title: '已完成', cardIds: doneIds },
      ],
    },
    {
      id: uuidv4(),
      name: '读书笔记',
      columns: [
        { id: 'todo', title: '待整理', cardIds: excerptIds.slice(10, 12) },
        { id: 'processing', title: '加工中', cardIds: excerptIds.slice(12, 14) },
        { id: 'done', title: '已完成', cardIds: excerptIds.slice(14, 15) },
      ],
    },
  ];
};

const mockExcerpts = generateMockExcerpts();
const mockWorkbenches = createDefaultWorkbenches(mockExcerpts.map(e => e.id));

const initialState: AppState = {
  excerpts: mockExcerpts,
  workbenches: mockWorkbenches,
  activeWorkbenchId: mockWorkbenches[0]?.id || null,
  searchQuery: '',
  selectedTagId: null,
  expandedCardId: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_EXCERPT': {
      const newExcerpts = [action.payload, ...state.excerpts];
      const activeWorkbench = state.workbenches.find(w => w.id === state.activeWorkbenchId);
      if (activeWorkbench) {
        const updatedWorkbenches = state.workbenches.map(w => {
          if (w.id === state.activeWorkbenchId) {
            return {
              ...w,
              columns: w.columns.map(col => {
                if (col.id === 'todo') {
                  return { ...col, cardIds: [action.payload.id, ...col.cardIds] };
                }
                return col;
              }),
            };
          }
          return w;
        });
        return { ...state, excerpts: newExcerpts, workbenches: updatedWorkbenches };
      }
      return { ...state, excerpts: newExcerpts };
    }

    case 'DELETE_EXCERPT': {
      const filteredExcerpts = state.excerpts.filter(e => e.id !== action.payload);
      const updatedWorkbenches = state.workbenches.map(w => ({
        ...w,
        columns: w.columns.map(col => ({
          ...col,
          cardIds: col.cardIds.filter(id => id !== action.payload),
        })),
      }));
      return {
        ...state,
        excerpts: filteredExcerpts,
        workbenches: updatedWorkbenches,
        expandedCardId: state.expandedCardId === action.payload ? null : state.expandedCardId,
      };
    }

    case 'UPDATE_EXCERPT': {
      const updatedExcerpts = state.excerpts.map(e =>
        e.id === action.payload.id ? action.payload : e
      );
      return { ...state, excerpts: updatedExcerpts };
    }

    case 'ADD_TAG_TO_EXCERPT': {
      const { excerptId, tag } = action.payload;
      const updatedExcerpts = state.excerpts.map(e => {
        if (e.id === excerptId) {
          if (e.tags.length >= 3) return e;
          return { ...e, tags: [...e.tags, tag] };
        }
        return e;
      });
      return { ...state, excerpts: updatedExcerpts };
    }

    case 'REMOVE_TAG_FROM_EXCERPT': {
      const { excerptId, tagId } = action.payload;
      const updatedExcerpts = state.excerpts.map(e => {
        if (e.id === excerptId) {
          return { ...e, tags: e.tags.filter(t => t.id !== tagId) };
        }
        return e;
      });
      return { ...state, excerpts: updatedExcerpts };
    }

    case 'ADD_ANNOTATION': {
      const { excerptId, annotation } = action.payload;
      const updatedExcerpts = state.excerpts.map(e => {
        if (e.id === excerptId) {
          return { ...e, annotations: [...e.annotations, annotation] };
        }
        return e;
      });
      return { ...state, excerpts: updatedExcerpts };
    }

    case 'ADD_RELATED_CARD': {
      const { excerptId, relatedCardId } = action.payload;
      const updatedExcerpts = state.excerpts.map(e => {
        if (e.id === excerptId && !e.relatedCardIds.includes(relatedCardId)) {
          return { ...e, relatedCardIds: [...e.relatedCardIds, relatedCardId] };
        }
        return e;
      });
      return { ...state, excerpts: updatedExcerpts };
    }

    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };

    case 'SET_SELECTED_TAG':
      return { ...state, selectedTagId: action.payload };

    case 'SET_EXPANDED_CARD':
      return { ...state, expandedCardId: action.payload };

    case 'ADD_WORKBENCH':
      return {
        ...state,
        workbenches: [...state.workbenches, action.payload],
        activeWorkbenchId: action.payload.id,
      };

    case 'SET_ACTIVE_WORKBENCH':
      return { ...state, activeWorkbenchId: action.payload };

    case 'MOVE_CARD': {
      const { cardId, fromColumn, toColumn, toIndex } = action.payload;
      const updatedWorkbenches = state.workbenches.map(w => {
        if (w.id !== state.activeWorkbenchId) return w;

        const newColumns = w.columns.map(col => {
          if (col.id === fromColumn) {
            return { ...col, cardIds: col.cardIds.filter(id => id !== cardId) };
          }
          return col;
        }).map(col => {
          if (col.id === toColumn) {
            const newCardIds = [...col.cardIds];
            newCardIds.splice(toIndex, 0, cardId);
            return { ...col, cardIds: newCardIds };
          }
          return col;
        });

        return { ...w, columns: newColumns };
      });

      return { ...state, workbenches: updatedWorkbenches };
    }

    case 'ADD_CARD_TO_COLUMN': {
      const { excerptId, columnId } = action.payload;
      const updatedWorkbenches = state.workbenches.map(w => {
        if (w.id !== state.activeWorkbenchId) return w;
        return {
          ...w,
          columns: w.columns.map(col => {
            if (col.id === columnId && !col.cardIds.includes(excerptId)) {
              return { ...col, cardIds: [...col.cardIds, excerptId] };
            }
            return col;
          }),
        };
      });
      return { ...state, workbenches: updatedWorkbenches };
    }

    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
