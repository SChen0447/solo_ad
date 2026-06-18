import { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { CarAssembler } from '../modules/carAssembler';
import { CameraController, ControlPanel } from '../controllers/viewController';
import { useAppStore } from '../store/useAppStore';
import { DEFAULT_CAMERA_STATE } from '../types';
import './App.css';

function Scene({ side }: { side: 'left' | 'right' | 'single' }) {
  const controlsRef = useRef<any>(null);

  return (
    <>
      <CameraController controlsRef={controlsRef} />
      <CarAssembler side={side} />
    </>
  );
}

function SplitDivider({ visible }: { visible: boolean }) {
  const [width, setWidth] = useState(visible ? 2 : 0);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setWidth(2), 10);
      return () => clearTimeout(timer);
    } else {
      setWidth(0);
    }
  }, [visible]);

  return (
    <div
      className="split-divider"
      style={{
        width: `${width}px`,
        transition: 'width 0.3s ease-out',
      }}
    />
  );
}

function SceneLabel({ text, visible }: { text: string; visible: boolean }) {
  if (!visible) return null;
  return <div className="scene-label">{text}</div>;
}

export default function App() {
  const comparisonMode = useAppStore((state) => state.comparisonMode);
  const leftWheelParams = useAppStore((state) => state.leftWheelParams);
  const rightWheelParams = useAppStore((state) => state.rightWheelParams);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const leftWheelName =
    leftWheelParams.wheelId.replace('wheel', '');
  const rightWheelName =
    rightWheelParams.wheelId.replace('wheel', '');

  return (
    <div className="app-container">
      {!isMobile && <ControlPanel />}
      {isMobile && <ControlPanel />}

      <div className="scene-container">
        <div className="scene-wrapper">
          {comparisonMode ? (
            <>
              <div className="scene-split scene-left">
                <Canvas
                  shadows camera={{ position: DEFAULT_CAMERA_STATE.position, fov: 50, near: 0.1, far: 1000 }}>
                  <color attach="background" args={['#1a1a1a']} />
                  <fog attach="fog" args={['#1a1a1a', 10, 30]} />
                  <Scene side="left" />
                </Canvas>
                <SceneLabel text={`轮毂 ${leftWheelName}`} visible={comparisonMode} />
              </div>
              <SplitDivider visible={comparisonMode} />
              <div className="scene-split scene-right">
                <Canvas
                  shadows camera={{ position: DEFAULT_CAMERA_STATE.position, fov: 50, near: 0.1, far: 1000 }}>
                  <color attach="background" args={['#1a1a1a']} />
                  <fog attach="fog" args={['#1a1a1a', 10, 30]} />
                  <Scene side="right" />
                </Canvas>
                <SceneLabel text={`轮毂 ${rightWheelName}`} visible={comparisonMode} />
              </div>
            </>
          ) : (
            <div className="scene-single">
              <Canvas
            shadows camera={{ position: DEFAULT_CAMERA_STATE.position, fov: 50, near: 0.1, far: 1000 }}>
                <color attach="background" args={['#1a1a1a']} />
                <fog attach="fog" args={['#1a1a1a', 10, 30]} />
                <Scene side="single" />
              </Canvas>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
