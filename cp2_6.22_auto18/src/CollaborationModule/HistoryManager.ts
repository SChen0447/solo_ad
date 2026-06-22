import { v4 as uuidv4 } from 'uuid';
import type { CanvasElement, HistoryEntry, ActionType } from '../types';

const MAX_HISTORY = 50;

export interface HistoryState {
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  currentElements: CanvasElement[];
}

export function createInitialState(initialElements: CanvasElement[] = []): HistoryState {
  return {
    undoStack: [],
    redoStack: [],
    currentElements: initialElements,
  };
}

function createEntry(
  elements: CanvasElement[],
  action: ActionType,
  description: string
): HistoryEntry {
  return {
    id: uuidv4(),
    action,
    timestamp: Date.now(),
    elements: JSON.parse(JSON.stringify(elements)),
    description,
  };
}

function getActionType(action: string): ActionType {
  const validActions: ActionType[] = ['add', 'delete', 'move', 'modify'];
  return validActions.includes(action as ActionType)
    ? (action as ActionType)
    : 'modify';
}

function getDescription(action: ActionType): string {
  const descriptions: Record<ActionType, string> = {
    add: '添加元素',
    delete: '删除元素',
    move: '移动元素',
    modify: '修改元素',
  };
  return descriptions[action];
}

export function pushHistory(
  state: HistoryState,
  elements: CanvasElement[],
  action: string
): HistoryState {
  const actionType = getActionType(action);
  const description = getDescription(actionType);
  const entry = createEntry(state.currentElements, actionType, description);

  const newUndoStack = [...state.undoStack, entry];
  if (newUndoStack.length > MAX_HISTORY) {
    newUndoStack.shift();
  }

  return {
    undoStack: newUndoStack,
    redoStack: [],
    currentElements: JSON.parse(JSON.stringify(elements)),
  };
}

export function undo(state: HistoryState): {
  state: HistoryState;
  previousElements: CanvasElement[];
  success: boolean;
} {
  if (state.undoStack.length === 0) {
    return { state, previousElements: state.currentElements, success: false };
  }

  const entry = state.undoStack[state.undoStack.length - 1];
  const newUndoStack = state.undoStack.slice(0, -1);
  const redoEntry = createEntry(state.currentElements, entry.action, entry.description);

  return {
    state: {
      undoStack: newUndoStack,
      redoStack: [...state.redoStack, redoEntry],
      currentElements: JSON.parse(JSON.stringify(entry.elements)),
    },
    previousElements: entry.elements,
    success: true,
  };
}

export function redo(state: HistoryState): {
  state: HistoryState;
  nextElements: CanvasElement[];
  success: boolean;
} {
  if (state.redoStack.length === 0) {
    return { state, nextElements: state.currentElements, success: false };
  }

  const entry = state.redoStack[state.redoStack.length - 1];
  const newRedoStack = state.redoStack.slice(0, -1);
  const undoEntry = createEntry(state.currentElements, entry.action, entry.description);

  return {
    state: {
      undoStack: [...state.undoStack, undoEntry],
      redoStack: newRedoStack,
      currentElements: JSON.parse(JSON.stringify(entry.elements)),
    },
    nextElements: entry.elements,
    success: true,
  };
}

export function getRecentHistory(state: HistoryState, count: number = 10): HistoryEntry[] {
  const allEntries = [...state.undoStack].reverse();
  return allEntries.slice(0, count);
}

export function canUndo(state: HistoryState): boolean {
  return state.undoStack.length > 0;
}

export function canRedo(state: HistoryState): boolean {
  return state.redoStack.length > 0;
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function getActionIcon(action: ActionType): string {
  const icons: Record<ActionType, string> = {
    add: '+',
    delete: '🗑',
    move: '✥',
    modify: '✎',
  };
  return icons[action];
}
