import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import Scene3D from '@render/Scene3D';
import UI from '@render/UI';

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#1a1a1a' }}>
      <Canvas
        shadows
        camera={{ position: [0, 18, 18], fov: 50 }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Scene3D />
        </Suspense>
      </Canvas>
      <UI />
    </div>
  );
}
