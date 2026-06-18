import React, { useEffect, useState, useRef } from 'react';
import { SceneCanvas } from './scene';
import { ControlPanel, StatsPanel } from './controls';
import { useSeismicStore } from './store';

function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const updateSimulation = useSeismicStore((state) => state.updateSimulation);
  const isSimulating = useSeismicStore((state) => state.isSimulating);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const tick = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      if (isSimulating && deltaTime > 0 && deltaTime < 0.1) {
        updateSimulation(deltaTime);
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSimulating, updateSimulation]);

  useEffect(() => {
    lastTimeRef.current = 0;
  }, [isSimulating]);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    height: '100%',
    backgroundColor: '#0b0f1a',
    position: 'relative',
    overflow: 'hidden',
  };

  const sceneContainerStyle: React.CSSProperties = {
    flex: isMobile ? 1 : undefined,
    width: isMobile ? '100%' : '70%',
    height: '100%',
    position: 'relative',
  };

  const controlPanelStyle: React.CSSProperties = {
    width: '30%',
    height: '100%',
    minWidth: '320px',
    flexShrink: 0,
    borderLeft: isMobile ? 'none' : '1px solid #3a3f4f',
  };

  return (
    <div style={containerStyle}>
      <div style={sceneContainerStyle}>
        <SceneCanvas />
        <StatsPanel />
        {isMobile && (
          <ControlPanel
            isMobile={true}
            drawerOpen={drawerOpen}
            onToggleDrawer={() => setDrawerOpen(!drawerOpen)}
          />
        )}
      </div>
      {!isMobile && <div style={controlPanelStyle}>
        <ControlPanel isMobile={false} drawerOpen={false} onToggleDrawer={() => {}} />
      </div>}
    </div>
  );
}

export default App;
