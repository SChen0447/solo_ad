import { useState, useCallback, useRef } from 'react';
import type { LineData, PublishLineRequest } from '../types';
import { canvasApi } from '../api/canvasApi';

const MAX_HISTORY = 50;

export function useCanvasHistory() {
  const [history, setHistory] = useState<PublishLineRequest[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isRedoing, setIsRedoing] = useState(false);
  const publishedLinesRef = useRef<LineData[]>([]);

  const addLine = useCallback((line: PublishLineRequest) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(line);
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex >= 0) {
      setIsUndoing(true);
      setHistoryIndex((prev) => prev - 1);
      setTimeout(() => setIsUndoing(false), 150);
      return history[historyIndex];
    }
    return null;
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setIsRedoing(true);
      setHistoryIndex((prev) => prev + 1);
      setTimeout(() => setIsRedoing(false), 150);
      return history[historyIndex + 1];
    }
    return null;
  }, [historyIndex, history]);

  const getCurrentLines = useCallback(() => {
    return history.slice(0, historyIndex + 1);
  }, [history, historyIndex]);

  const publishToServer = useCallback(async () => {
    const lines = getCurrentLines();
    if (lines.length === 0) return null;

    try {
      const result = await canvasApi.publishLines(lines);
      if (result.success) {
        publishedLinesRef.current = [...publishedLinesRef.current, ...result.lines];
        setHistory([]);
        setHistoryIndex(-1);
      }
      return result;
    } catch (error) {
      console.error('Publish failed:', error);
      throw error;
    }
  }, [getCurrentLines]);

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    history,
    historyIndex,
    addLine,
    undo,
    redo,
    canUndo,
    canRedo,
    isUndoing,
    isRedoing,
    getCurrentLines,
    publishToServer,
    publishedLines: publishedLinesRef.current,
  };
}
