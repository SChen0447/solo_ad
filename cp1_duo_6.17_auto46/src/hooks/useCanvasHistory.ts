import { useState, useCallback, useRef } from 'react';
import { LineData, canvasApi, SnapshotResult } from '../api/canvasApi';

export interface HistoryStep {
  lines: LineData[];
  timestamp: number;
}

const MAX_HISTORY_STEPS = 50;

export function useCanvasHistory() {
  const [undoStack, setUndoStack] = useState<HistoryStep[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryStep[]>([]);
  const [localLines, setLocalLines] = useState<LineData[]>([]);
  const [isRestoringSnapshot, setIsRestoringSnapshot] = useState(false);
  const [snapshotInfo, setSnapshotInfo] = useState<{
    onlineCount: number;
    newLinesCount: number;
  } | null>(null);

  const pendingSnapshotRef = useRef<SnapshotResult | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const localLinesRef = useRef<LineData[]>([]);

  const pushHistory = useCallback((lines: LineData[]) => {
    const newStep: HistoryStep = {
      lines: JSON.parse(JSON.stringify(lines)),
      timestamp: Date.now(),
    };
    setUndoStack((prev) => {
      const newStack = [...prev, newStep];
      if (newStack.length > MAX_HISTORY_STEPS) {
        return newStack.slice(newStack.length - MAX_HISTORY_STEPS);
      }
      return newStack;
    });
    setRedoStack([]);
  }, []);

  const addLocalLine = useCallback((line: LineData) => {
    setLocalLines((prev) => {
      const newLines = [...prev, line];
      localLinesRef.current = newLines;
      pushHistory(newLines);
      return newLines;
    });
  }, [pushHistory]);

  const clearLocalLines = useCallback(() => {
    setLocalLines([]);
    localLinesRef.current = [];
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const canUndo = undoStack.length > 1 || (undoStack.length === 1 && localLines.length > 0);
  const canRedo = redoStack.length > 0;

  const undo = useCallback((): LineData[] | null => {
    let result: LineData[] | null = null;
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const newUndo = prev.slice(0, -1);
      const poppedStep = prev[prev.length - 1];
      setRedoStack((redoPrev) => [...redoPrev, poppedStep]);

      if (newUndo.length > 0) {
        const targetLines = newUndo[newUndo.length - 1].lines;
        setLocalLines(targetLines);
        localLinesRef.current = targetLines;
        result = targetLines;
      } else {
        setLocalLines([]);
        localLinesRef.current = [];
        result = [];
      }
      return newUndo;
    });
    return result;
  }, []);

  const redo = useCallback((): LineData[] | null => {
    let result: LineData[] | null = null;
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const newRedo = prev.slice(0, -1);
      const poppedStep = prev[prev.length - 1];
      setUndoStack((undoPrev) => [...undoPrev, poppedStep]);
      setLocalLines(poppedStep.lines);
      localLinesRef.current = poppedStep.lines;
      result = poppedStep.lines;
      return newRedo;
    });
    return result;
  }, []);

  const fetchSnapshot = useCallback(async (targetTime: number): Promise<LineData[] | null> => {
    try {
      const snapshot = await canvasApi.getSnapshot(targetTime);
      pendingSnapshotRef.current = snapshot;
      setSnapshotInfo({
        onlineCount: snapshot.online_count,
        newLinesCount: snapshot.new_lines_count,
      });
      return snapshot.lines;
    } catch (error) {
      console.error('[useCanvasHistory] 获取历史快照失败:', error);
      return null;
    }
  }, []);

  const animateToSnapshot = useCallback((
    targetLines: LineData[],
    onProgress: (lines: LineData[]) => void,
    duration = 600
  ) => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setIsRestoringSnapshot(true);
    const startTime = performance.now();
    const currentLines = localLinesRef.current;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);

      const fromCount = currentLines.length;
      const toCount = targetLines.length;
      const visibleCount = Math.round(fromCount + (toCount - fromCount) * eased);
      const displayLines = targetLines.slice(0, Math.max(0, visibleCount));

      onProgress(displayLines);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsRestoringSnapshot(false);
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  const cancelSnapshotAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      setIsRestoringSnapshot(false);
    }
  }, []);

  const clearSnapshotInfo = useCallback(() => {
    setSnapshotInfo(null);
  }, []);

  return {
    localLines,
    setLocalLines,
    localLinesRef,
    addLocalLine,
    clearLocalLines,
    canUndo,
    canRedo,
    undo,
    redo,
    pushHistory,
    fetchSnapshot,
    animateToSnapshot,
    cancelSnapshotAnimation,
    isRestoringSnapshot,
    snapshotInfo,
    clearSnapshotInfo,
  };
}

export default useCanvasHistory;
