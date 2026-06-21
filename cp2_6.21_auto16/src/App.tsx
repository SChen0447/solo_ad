import React, { useEffect } from 'react';
import Toolbar from './components/Toolbar';
import Canvas from './components/Canvas';
import HistoryIndicator from './components/HistoryIndicator';
import { useCanvasStore } from './store/canvasStore';

const App: React.FC = () => {
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const deleteElement = useCanvasStore((s) => s.deleteElement);
  const selectedId = useCanvasStore((s) => s.selectedId);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (isCtrl && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((isCtrl && key === 'z' && e.shiftKey) || (isCtrl && key === 'y')) {
        e.preventDefault();
        redo();
      } else if ((key === 'delete' || key === 'backspace') && selectedId) {
        const target = e.target as HTMLElement;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        deleteElement(selectedId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, selectedId, deleteElement]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#F0F2F5',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 48,
          background: 'linear-gradient(90deg, #667EEA 0%, #764BA2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: 0.5,
          boxShadow: '0 2px 10px rgba(102, 126, 234, 0.3)',
          zIndex: 50,
        }}
      >
        <span style={{ marginRight: 8 }}>🎨</span>
        Collab Whiteboard · 在线协作白板
      </div>
      <Toolbar />
      <Canvas />
      <HistoryIndicator />
    </div>
  );
};

export default App;
