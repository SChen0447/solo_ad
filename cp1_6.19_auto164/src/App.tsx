import React, { useState, useEffect, useCallback } from 'react';
import ParticleSimulator from './scene/ParticleSimulator';
import ControlPanel from './ui/ControlPanel';
import StatsPanel from './ui/StatsPanel';
import Minimap from './ui/Minimap';

const App: React.FC = () => {
  const [gravity, setGravity] = useState(9.8);
  const [friction, setFriction] = useState(0.6);
  const [emitRate, setEmitRate] = useState(50);
  const [clearTrigger, setClearTrigger] = useState(false);
  const [particleCount, setParticleCount] = useState(0);
  const [averageHeight, setAverageHeight] = useState(0);
  const [heightGrid, setHeightGrid] = useState<number[][]>([]);
  const [maxParticlesReached, setMaxParticlesReached] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleClear = useCallback(() => {
    setClearTrigger((prev) => !prev);
  }, []);

  const handleParticleCountChange = useCallback((count: number) => {
    setParticleCount(count);
  }, []);

  const handleAverageHeightChange = useCallback((height: number) => {
    setAverageHeight(height);
  }, []);

  const handleHeightGridChange = useCallback((grid: number[][]) => {
    setHeightGrid(grid);
  }, []);

  const handleMaxParticlesReached = useCallback((reached: boolean) => {
    setMaxParticlesReached(reached);
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'linear-gradient(180deg, #0A1628 0%, #1A2535 50%, #2C3E50 100%)',
        overflow: 'hidden',
      }}
    >
      <ParticleSimulator
        gravity={gravity}
        friction={friction}
        emitRate={emitRate}
        onClear={clearTrigger}
        onParticleCountChange={handleParticleCountChange}
        onAverageHeightChange={handleAverageHeightChange}
        onHeightGridChange={handleHeightGridChange}
        onMaxParticlesReached={handleMaxParticlesReached}
      />

      <StatsPanel particleCount={particleCount} averageHeight={averageHeight} />

      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          zIndex: 50,
        }}
      >
        <Minimap heightGrid={heightGrid} maxHeight={averageHeight * 2} />
      </div>

      <ControlPanel
        gravity={gravity}
        friction={friction}
        emitRate={emitRate}
        onGravityChange={setGravity}
        onFrictionChange={setFriction}
        onEmitRateChange={setEmitRate}
        onClear={handleClear}
        isMobile={isMobile}
      />

      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#B8C5D6',
          fontSize: '18px',
          fontWeight: 600,
          letterSpacing: '1px',
          zIndex: 50,
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        3D沙粒动力学沙盒
      </div>
    </div>
  );
};

export default App;
