import React from 'react';
import ReactDOM from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { Scene } from '@/components/Scene';
import { UIPanel } from '@/components/UIPanel';
import { useStore } from '@/store/useStore';

function App() {
  const backgroundColor = useStore(state => state.backgroundColor);

  const bgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    transition: 'background-color 0.5s ease',
  };

  return (
    <div style={bgStyle}>
      <Canvas
        camera={{ position: [6, 4, 8], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: false }}
      >
        <Scene />
      </Canvas>
      <UIPanel />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
