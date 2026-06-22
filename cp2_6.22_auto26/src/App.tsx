import React, { useEffect } from 'react';
import Toolbar from '@/CollaborationModule/Toolbar';
import HistorySidebar from '@/CollaborationModule/HistorySidebar';
import Canvas from '@/CanvasModule/Canvas';
import { useWhiteboardStore } from '@/store';

const App: React.FC = () => {
  const undo = useWhiteboardStore(s => s.undo);
  const redo = useWhiteboardStore(s => s.redo);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedId = useWhiteboardStore.getState().selectedId;
        if (selectedId) {
          e.preventDefault();
          useWhiteboardStore.getState().deleteElement(selectedId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <div style={styles.root}>
      <Toolbar />
      <div style={styles.body}>
        <Canvas />
        <HistorySidebar />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: '#F8FAFC',
    minWidth: 1024,
  },
  body: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
};

export default App;
