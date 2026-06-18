import React from 'react';
import ReactDOM from 'react-dom/client';
import Scene from './Scene';
import { ControlBar, ScrollCard } from './ui';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Scene />
      <ControlBar />
      <ScrollCard />
    </div>
  </React.StrictMode>
);
