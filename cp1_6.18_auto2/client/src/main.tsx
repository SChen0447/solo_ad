import React from 'react';
import ReactDOM from 'react-dom/client';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import { useSocket } from './hooks/useSocket';

const App: React.FC = () => {
  const socketData = useSocket();

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Toolbar
        onAddNode={socketData.handleAddNode}
        onDeleteNode={socketData.handleDeleteSelected}
        onUndo={socketData.handleUndo}
        onRedo={socketData.handleRedo}
        canUndo={socketData.canUndo}
        canRedo={socketData.canRedo}
        onExportPNG={socketData.handleExportPNG}
        selectedNodeId={socketData.selectedNodeId}
      />
      <Canvas {...socketData} />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
