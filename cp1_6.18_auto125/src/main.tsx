import React from 'react';
import ReactDOM from 'react-dom/client';
import { Scene } from './components/Scene';
import { Controls } from './components/Controls';

const App: React.FC = () => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Scene />
      <Controls />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
