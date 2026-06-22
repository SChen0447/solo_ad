import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Canvas } from './CanvasModule/Canvas';
import { Toolbar } from './CollaborationModule/Toolbar';
import { HistorySidebar } from './CollaborationModule/HistorySidebar';
import {
  createInitialState,
  pushHistory,
  undo,
  redo,
  getRecentHistory,
  canUndo,
  canRedo,
} from './CollaborationModule/HistoryManager';
import type { CanvasElement as CanvasElementType, ToolType } from './types';

export const App: React.FC = () => {
  const [elements, setElements] = useState<CanvasElementType[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentTool, setCurrentTool] = useState<ToolType>('select');
  const [showHistory, setShowHistory] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [historyState, setHistoryState] = useState(createInitialState([]));

  const handleHistoryPush = useCallback(
    (newElements: CanvasElementType[], action: string) => {
      setHistoryState((prev) => pushHistory(prev, newElements, action));
    },
    []
  );

  const handleUndo = useCallback(() => {
    if (!canUndo(historyState)) return;

    setIsTransitioning(true);
    setTimeout(() => {
      const result = undo(historyState);
      if (result.success) {
        setHistoryState(result.state);
        setElements(result.previousElements);
      }
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 200);
  }, [historyState]);

  const handleRedo = useCallback(() => {
    if (!canRedo(historyState)) return;

    setIsTransitioning(true);
    setTimeout(() => {
      const result = redo(historyState);
      if (result.success) {
        setHistoryState(result.state);
        setElements(result.nextElements);
      }
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 200);
  }, [historyState]);

  const handleToggleHistory = useCallback(() => {
    setShowHistory((prev) => !prev);
  }, []);

  const handleCloseHistory = useCallback(() => {
    setShowHistory(false);
  }, []);

  const recentHistory = useMemo(() => {
    return getRecentHistory(historyState, 10);
  }, [historyState]);

  const currentHistoryIndex = useMemo(() => {
    return historyState.undoStack.length > 0 ? 0 : -1;
  }, [historyState.undoStack.length]);

  useEffect(() => {
    if (currentTool !== 'select' && currentTool !== 'path') {
      setCurrentTool('select');
    }
  }, [elements]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          const newElements = elements.filter((el) => el.id !== selectedId);
          handleHistoryPush(newElements, 'delete');
          setElements(newElements);
          setSelectedId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, elements, handleHistoryPush]);

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '700px',
      }}
    >
      <Toolbar
        currentTool={currentTool}
        setCurrentTool={setCurrentTool}
        canUndo={canUndo(historyState)}
        canRedo={canRedo(historyState)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleHistory={handleToggleHistory}
        showHistory={showHistory}
      />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Canvas
          elements={elements}
          setElements={setElements}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          currentTool={currentTool}
          onHistoryPush={handleHistoryPush}
          isTransitioning={isTransitioning}
        />
      </div>
      <HistorySidebar
        isOpen={showHistory}
        onClose={handleCloseHistory}
        historyEntries={recentHistory}
        currentIndex={currentHistoryIndex}
      />
    </div>
  );
};
