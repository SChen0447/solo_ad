import React from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ThreeScene } from './components/Scene';

const App: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ThreeScene />
      <ControlPanel />
    </div>
  );
};

export default App;
