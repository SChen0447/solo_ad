import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type ElementType = 'rectangle' | 'circle' | 'triangle' | 'speechBubble' | 'dialogBox';
export type SubjectType = 'scene' | 'character' | 'object';

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke: string;
  text?: string;
  tailDirection?: number;
}

export interface Panel {
  id: string;
  order: number;
  description: string;
  subjectType: SubjectType;
  elements: CanvasElement[];
}

export interface AppState {
  panels: Panel[];
  selectedPanelId: string | null;
  selectedElementId: string | null;
}

type Action =
  | { type: 'ADD_PANEL' }
  | { type: 'DELETE_PANEL'; payload: string }
  | { type: 'SELECT_PANEL'; payload: string }
  | { type: 'EDIT_PANEL_DESCRIPTION'; payload: { id: string; description: string } }
  | { type: 'REORDER_PANELS'; payload: string[] }
  | { type: 'SET_PANEL_SUBJECT'; payload: { id: string; subjectType: SubjectType } }
  | { type: 'ADD_ELEMENT'; payload: { panelId: string; element: CanvasElement } }
  | { type: 'UPDATE_ELEMENT'; payload: { panelId: string; elementId: string; updates: Partial<CanvasElement> } }
  | { type: 'DELETE_ELEMENT'; payload: { panelId: string; elementId: string } }
  | { type: 'SELECT_ELEMENT'; payload: string | null };

const createInitialPanels = (): Panel[] => [
  {
    id: uuidv4(),
    order: 1,
    description: '主角站在山顶眺望远方',
    subjectType: 'character',
    elements: [],
  },
  {
    id: uuidv4(),
    order: 2,
    description: '夕阳西下的城市天际线',
    subjectType: 'scene',
    elements: [],
  },
  {
    id: uuidv4(),
    order: 3,
    description: '桌上放着一本神秘的书',
    subjectType: 'object',
    elements: [],
  },
];

const initialState: AppState = {
  panels: createInitialPanels(),
  selectedPanelId: null,
  selectedElementId: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_PANEL': {
      const newPanel: Panel = {
        id: uuidv4(),
        order: state.panels.length + 1,
        description: '新分镜',
        subjectType: 'scene',
        elements: [],
      };
      return {
        ...state,
        panels: [...state.panels, newPanel],
        selectedPanelId: newPanel.id,
        selectedElementId: null,
      };
    }
    case 'DELETE_PANEL': {
      const panels = state.panels
        .filter((p) => p.id !== action.payload)
        .map((p, idx) => ({ ...p, order: idx + 1 }));
      const selectedPanelId =
        state.selectedPanelId === action.payload
          ? panels.length > 0
            ? panels[0].id
            : null
          : state.selectedPanelId;
      return {
        ...state,
        panels,
        selectedPanelId,
        selectedElementId: null,
      };
    }
    case 'SELECT_PANEL':
      return {
        ...state,
        selectedPanelId: action.payload,
        selectedElementId: null,
      };
    case 'EDIT_PANEL_DESCRIPTION':
      return {
        ...state,
        panels: state.panels.map((p) =>
          p.id === action.payload.id
            ? { ...p, description: action.payload.description }
            : p
        ),
      };
    case 'REORDER_PANELS': {
      const idOrder = action.payload;
      const panels = state.panels
        .slice()
        .sort((a, b) => idOrder.indexOf(a.id) - idOrder.indexOf(b.id))
        .map((p, idx) => ({ ...p, order: idx + 1 }));
      return { ...state, panels };
    }
    case 'SET_PANEL_SUBJECT':
      return {
        ...state,
        panels: state.panels.map((p) =>
          p.id === action.payload.id
            ? { ...p, subjectType: action.payload.subjectType }
            : p
        ),
      };
    case 'ADD_ELEMENT':
      return {
        ...state,
        panels: state.panels.map((p) =>
          p.id === action.payload.panelId
            ? { ...p, elements: [...p.elements, action.payload.element] }
            : p
        ),
        selectedElementId: action.payload.element.id,
      };
    case 'UPDATE_ELEMENT':
      return {
        ...state,
        panels: state.panels.map((p) =>
          p.id === action.payload.panelId
            ? {
                ...p,
                elements: p.elements.map((e) =>
                  e.id === action.payload.elementId
                    ? { ...e, ...action.payload.updates }
                    : e
                ),
              }
            : p
        ),
      };
    case 'DELETE_ELEMENT':
      return {
        ...state,
        panels: state.panels.map((p) =>
          p.id === action.payload.panelId
            ? {
                ...p,
                elements: p.elements.filter((e) => e.id !== action.payload.elementId),
              }
            : p
        ),
        selectedElementId:
          state.selectedElementId === action.payload.elementId
            ? null
            : state.selectedElementId,
      };
    case 'SELECT_ELEMENT':
      return { ...state, selectedElementId: action.payload };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  getSelectedPanel: () => Panel | undefined;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const getSelectedPanel = () => {
    return state.panels.find((p) => p.id === state.selectedPanelId);
  };

  return React.createElement(
    AppContext.Provider,
    { value: { state, dispatch, getSelectedPanel } },
    children
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export const SUBJECT_COLORS: Record<SubjectType, string> = {
  scene: '#10B981',
  character: '#3B82F6',
  object: '#8B5CF6',
};

export const PRESET_COLORS: Record<ElementType, { fill: string; stroke: string }[]> = {
  rectangle: [
    { fill: '#6B7280', stroke: '#4B5563' },
    { fill: '#EF4444', stroke: '#B91C1C' },
    { fill: '#F59E0B', stroke: '#B45309' },
    { fill: '#10B981', stroke: '#059669' },
    { fill: '#8B5CF6', stroke: '#6D28D9' },
  ],
  circle: [
    { fill: '#6B7280', stroke: '#4B5563' },
    { fill: '#3B82F6', stroke: '#1D4ED8' },
    { fill: '#EC4899', stroke: '#BE185D' },
    { fill: '#14B8A6', stroke: '#0F766E' },
    { fill: '#F97316', stroke: '#C2410C' },
  ],
  triangle: [
    { fill: '#6B7280', stroke: '#4B5563' },
    { fill: '#8B5CF6', stroke: '#6D28D9' },
    { fill: '#06B6D4', stroke: '#0891B2' },
    { fill: '#EAB308', stroke: '#A16207' },
    { fill: '#F43F5E', stroke: '#BE123C' },
  ],
  speechBubble: [
    { fill: '#FFFFFF', stroke: '#D1D5DB' },
    { fill: '#FEF3C7', stroke: '#F59E0B' },
    { fill: '#DBEAFE', stroke: '#3B82F6' },
    { fill: '#D1FAE5', stroke: '#10B981' },
    { fill: '#FCE7F3', stroke: '#EC4899' },
  ],
  dialogBox: [
    { fill: '#FFFFFF', stroke: '#D1D5DB' },
    { fill: '#1F2937', stroke: '#111827' },
    { fill: '#FEF3C7', stroke: '#F59E0B' },
    { fill: '#DBEAFE', stroke: '#3B82F6' },
    { fill: '#E5E7EB', stroke: '#6B7280' },
  ],
};

export const DEFAULT_SIZES: Record<ElementType, { width: number; height: number }> = {
  rectangle: { width: 120, height: 80 },
  circle: { width: 80, height: 80 },
  triangle: { width: 100, height: 80 },
  speechBubble: { width: 160, height: 80 },
  dialogBox: { width: 200, height: 60 },
};

export function createElement(type: ElementType, x: number, y: number, colorIndex = 0): CanvasElement {
  const colors = PRESET_COLORS[type][colorIndex];
  const size = DEFAULT_SIZES[type];
  return {
    id: uuidv4(),
    type,
    x,
    y,
    width: size.width,
    height: size.height,
    rotation: 0,
    fill: colors.fill,
    stroke: colors.stroke,
    text: type === 'speechBubble' || type === 'dialogBox' ? '' : undefined,
    tailDirection: type === 'speechBubble' ? 90 : undefined,
  };
}
