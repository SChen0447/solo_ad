import React, { useState, useEffect, useRef, useCallback } from 'react';
import Scene, { SceneRef } from './components/Scene';
import ForceController from './components/ForceController';
import PresetSelector from './components/PresetSelector';
import PerformanceMonitor from './components/PerformanceMonitor';
import {
  ForceParams,
  Preset,
  presets,
  lerpForceParams,
  easeInOutCubic,
  TRAIL_LENGTH
} from './utils/vectorField';

const TRANSITION_DURATION = 1500;

const App: React.FC = () => {
  const [forces, setForces] = useState<ForceParams>({
    x: 0.5,
    y: 0.3,
    z: 0.2,
    turbulence: 0.8
  });
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const sceneRef = useRef<SceneRef>(null);
  const transitionRef = useRef<{
    startForces: ForceParams;
    endForces: ForceParams;
    startTime: number;
    animationId: number | null;
  }>({
    startForces: forces,
    endForces: forces,
    startTime: 0,
    animationId: null
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const animateTransition = useCallback(() => {
    const transition = transitionRef.current;
    const elapsed = performance.now() - transition.startTime;
    const progress = Math.min(elapsed / TRANSITION_DURATION, 1);

    const interpolatedForces = lerpForceParams(
      transition.startForces,
      transition.endForces,
      progress
    );

    setForces(interpolatedForces);

    if (progress < 1) {
      transition.animationId = requestAnimationFrame(animateTransition);
    } else {
      transition.animationId = null;
    }
  }, []);

  const handlePresetSelect = useCallback((preset: Preset) => {
    const transition = transitionRef.current;

    if (transition.animationId !== null) {
      cancelAnimationFrame(transition.animationId);
    }

    transition.startForces = { ...forces };
    transition.endForces = { ...preset.forces };
    transition.startTime = performance.now();
    transition.animationId = requestAnimationFrame(animateTransition);

    setSelectedPreset(preset.id);
  }, [forces, animateTransition]);

  const handleForceChange = useCallback((newForces: ForceParams) => {
    const transition = transitionRef.current;
    if (transition.animationId !== null) {
      cancelAnimationFrame(transition.animationId);
      transition.animationId = null;
    }
    setForces(newForces);
    setSelectedPreset(null);
  }, []);

  const handleFpsChange = useCallback((fps: number) => {
    if (sceneRef.current) {
      if (fps < 30) {
        sceneRef.current.setTrailLength(15);
      } else if (fps >= 50) {
        sceneRef.current.setTrailLength(TRAIL_LENGTH);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (transitionRef.current.animationId !== null) {
        cancelAnimationFrame(transitionRef.current.animationId);
      }
    };
  }, []);

  return (
    <div style={styles.app}>
      <Scene ref={sceneRef} forces={forces} />
      <PresetSelector selectedPreset={selectedPreset} onSelect={handlePresetSelect} />
      <ForceController forces={forces} onChange={handleForceChange} isMobile={isMobile} />
      <PerformanceMonitor onFpsChange={handleFpsChange} />
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  app: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden'
  }
};

export default App;
