import type { CanvasElement, HistorySnapshot } from '@/types';

const MAX_HISTORY = 50;

export interface HistoryState {
  past: HistorySnapshot[];
  present: CanvasElement[];
  future: HistorySnapshot[];
}

export function createInitialHistory(elements: CanvasElement[] = []): HistoryState {
  return {
    past: [],
    present: elements,
    future: [],
  };
}

export function pushHistory(
  state: HistoryState,
  actionType: HistorySnapshot['actionType'],
  newElements: CanvasElement[]
): HistoryState {
  const snapshot: HistorySnapshot = {
    elements: state.present,
    actionType,
    timestamp: Date.now(),
  };
  const newPast = [...state.past, snapshot];
  if (newPast.length > MAX_HISTORY) {
    newPast.shift();
  }
  return {
    past: newPast,
    present: newElements,
    future: [],
  };
}

export function undo(state: HistoryState): HistoryState {
  if (state.past.length === 0) return state;
  const previous = state.past[state.past.length - 1];
  const newPast = state.past.slice(0, -1);
  const currentSnapshot: HistorySnapshot = {
    elements: state.present,
    actionType: 'edit',
    timestamp: Date.now(),
  };
  return {
    past: newPast,
    present: previous.elements,
    future: [currentSnapshot, ...state.future],
  };
}

export function redo(state: HistoryState): HistoryState {
  if (state.future.length === 0) return state;
  const next = state.future[0];
  const newFuture = state.future.slice(1);
  const currentSnapshot: HistorySnapshot = {
    elements: state.present,
    actionType: 'edit',
    timestamp: Date.now(),
  };
  return {
    past: [...state.past, currentSnapshot],
    present: next.elements,
    future: newFuture,
  };
}

export function getRecentActions(state: HistoryState, count: number = 10): HistorySnapshot[] {
  const allSnapshots = [...state.past];
  return allSnapshots.slice(-count).reverse();
}

export function canUndo(state: HistoryState): boolean {
  return state.past.length > 0;
}

export function canRedo(state: HistoryState): boolean {
  return state.future.length > 0;
}
