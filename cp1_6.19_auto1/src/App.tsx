import { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneManager } from './scene/SceneManager';
import { ControlPanel } from './ui/ControlPanel';
import { InfoPanel } from './ui/InfoPanel';

function CameraController() {
  const { camera } = useThree();

  useEffect(() => {
    if (camera) {
      camera.position.set(0, 200, 200);
      camera.lookAt(0, 0, 0);
    }
  }, [camera]);

  return null;
}

function App() {
  return (
    <div style={styles.appContainer}>
      <div style={styles.canvasContainer}>
        <Canvas
          shadows
          camera={{ position: [0, 200, 200], fov: 50, near: 0.1, far: 1000 }}
          gl={{ antialias: true }}
        >
          <color attach="background" args={['#0a192f']} />
          <CameraController />
          <SceneManager />
        </Canvas>
      </div>
      <ControlPanel />
      <InfoPanel />
      
      <div style={styles.mobileHint}>
        <span>拖拽旋转 · 滚轮缩放 · 点击建筑查看详情</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(180deg, #0a192f 0%, #1a365d 100%)',
  },
  canvasContainer: {
    width: '100%',
    height: '100%',
  },
  mobileHint: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    pointerEvents: 'none',
    zIndex: 50,
  },
};

export default App;
