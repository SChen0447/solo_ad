import { useState, useCallback, useRef, useEffect } from 'react';
import type { CanvasApi } from '../types/types';

export function useCanvasHistory(canvasApi: CanvasApi | null) {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const isLoadingRef = useRef(false);

  const MAX_HISTORY = 50;

  const saveState = useCallback(() => {
    if (!canvasApi || isLoadingRef.current) return;

    try {
      const state = JSON.stringify(canvasApi.getCanvasJSON());

      if (undoStackRef.current[undoStackRef.current.length - 1] === state) {
        return;
      }

      undoStackRef.current.push(state);
      if (undoStackRef.current.length > MAX_HISTORY) {
        undoStackRef.current.shift();
      }
      redoStackRef.current = [];

      setCanUndo(undoStackRef.current.length > 1);
      setCanRedo(false);
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }, [canvasApi]);

  const initializeHistory = useCallback(() => {
    if (!canvasApi) return;

    try {
      const initialState = JSON.stringify(canvasApi.getCanvasJSON());
      undoStackRef.current = [initialState];
      redoStackRef.current = [];
      setCanUndo(false);
      setCanRedo(false);
    } catch (e) {
      console.error('Failed to initialize history:', e);
    }
  }, [canvasApi]);

  const undo = useCallback(async () => {
    if (!canvasApi || undoStackRef.current.length <= 1) return;

    try {
      const current = undoStackRef.current.pop()!;
      redoStackRef.current.push(current);

      const previousState = undoStackRef.current[undoStackRef.current.length - 1];
      isLoadingRef.current = true;

      await canvasApi.loadFromJSON(JSON.parse(previousState));

      isLoadingRef.current = false;
      setCanUndo(undoStackRef.current.length > 1);
      setCanRedo(true);
    } catch (e) {
      console.error('Failed to undo:', e);
      isLoadingRef.current = false;
    }
  }, [canvasApi]);

  const redo = useCallback(async () => {
    if (!canvasApi || redoStackRef.current.length === 0) return;

    try {
      const nextState = redoStackRef.current.pop()!;
      undoStackRef.current.push(nextState);

      isLoadingRef.current = true;
      await canvasApi.loadFromJSON(JSON.parse(nextState));

      isLoadingRef.current = false;
      setCanUndo(true);
      setCanRedo(redoStackRef.current.length > 0);
    } catch (e) {
      console.error('Failed to redo:', e);
      isLoadingRef.current = false;
    }
  }, [canvasApi]);

  const clearHistory = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    canUndo,
    canRedo,
    saveState,
    initializeHistory,
    undo,
    redo,
    clearHistory,
  };
}
