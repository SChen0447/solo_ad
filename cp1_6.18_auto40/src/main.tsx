import React from 'react';
import ReactDOM from 'react-dom/client';
import SceneCanvas from '@components/SceneCanvas';
import UIPanel from '@components/UIPanel';

const App: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <SceneCanvas />
      <UIPanel />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
