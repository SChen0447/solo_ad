import React from 'react';
import ReactDOM from 'react-dom/client';
import { SceneManager } from './sceneManager';
import { UIPanel } from './uiPanel';

const containerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%'
};

const canvasContainerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%'
};

function App() {
  return (
    <div style={containerStyle}>
      <div style={canvasContainerStyle}>
        <SceneManager />
      </div>
      <UIPanel />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
