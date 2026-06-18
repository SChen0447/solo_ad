import React from 'react';
import { Canvas } from '@react-three/fiber';
import SceneRenderer from './SceneRenderer';
import UiController from './UiController';
import DataPanel from './DataPanel';

const App: React.FC = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#0a0a1a',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: '320px',
          bottom: '80px',
        }}
      >
        <Canvas
          camera={{
            position: [30, 25, 40],
            fov: 50,
            near: 0.1,
            far: 200,
          }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
          dpr={[1, 2]}
          style={{ background: '#0a0a1a' }}
        >
          <SceneRenderer />
        </Canvas>
      </div>

      <UiController />
      <DataPanel />
    </div>
  );
};

export default App;
