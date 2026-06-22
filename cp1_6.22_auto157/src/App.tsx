import { useRef, useState, useCallback, useEffect } from 'react';
import SceneView, { type SceneViewHandle } from './components/SceneView';
import ControlPanel from './components/ControlPanel';
import { DEFAULT_POLLUTION_SOURCES, type PollutionSourceConfig } from './pollution/PollutionSource';

function App() {
  const sceneRef = useRef<SceneViewHandle>(null);
  const [sources, setSources] = useState<PollutionSourceConfig[]>(DEFAULT_POLLUTION_SOURCES);
  const [globalWindMultiplier, setGlobalWindMultiplier] = useState(1.0);
  const [activeParticleCount, setActiveParticleCount] = useState(0);
  const [fps, setFps] = useState(60);

  const handleSourceUpdate = useCallback((updatedSource: PollutionSourceConfig) => {
    setSources((prev) =>
      prev.map((s) => (s.id === updatedSource.id ? updatedSource : s))
    );
    sceneRef.current?.updateSource(updatedSource);
  }, []);

  const handleWindMultiplierChange = useCallback((value: number) => {
    setGlobalWindMultiplier(value);
    sceneRef.current?.setGlobalWindMultiplier(value);
  }, []);

  const handleReset = useCallback(() => {
    sceneRef.current?.reset();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveParticleCount(sceneRef.current?.getActiveParticleCount() ?? 0);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  const titleStyle: React.CSSProperties = {
    position: 'fixed',
    top: 16,
    right: 16,
    zIndex: 99,
    background: 'rgba(30, 30, 40, 0.75)',
    backdropFilter: 'blur(8px)',
    padding: '10px 18px',
    borderRadius: 8,
    color: '#ffffff',
    fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
  };

  const titleMainStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: '#e0e0e0'
  };

  const titleSubStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#888899',
    marginTop: 2
  };

  const legendStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 16,
    left: 16,
    zIndex: 99,
    background: 'rgba(30, 30, 40, 0.75)',
    backdropFilter: 'blur(8px)',
    padding: '10px 14px',
    borderRadius: 8,
    color: '#e0e0e0',
    fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
    fontSize: 12,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
  };

  const gradientContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 6
  };

  const gradientStyle: React.CSSProperties = {
    width: 120,
    height: 10,
    borderRadius: 5,
    background: 'linear-gradient(to right, #ff3333, #ff9933, #33ff33)'
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <SceneView
        ref={sceneRef}
        sources={sources}
        onFpsUpdate={setFps}
      />

      <div style={titleStyle}>
        <div style={titleMainStyle}>🏙️ 城市空气质量3D动态模拟</div>
        <div style={titleSubStyle}>鼠标拖拽旋转视角 · 滚轮缩放</div>
      </div>

      <ControlPanel
        sources={sources}
        onSourceUpdate={handleSourceUpdate}
        globalWindMultiplier={globalWindMultiplier}
        onWindMultiplierChange={handleWindMultiplierChange}
        onReset={handleReset}
        activeParticleCount={activeParticleCount}
        fps={fps}
      />

      <div style={legendStyle}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>污染物浓度图例</div>
        <div style={gradientContainerStyle}>
          <span style={{ color: '#ff6666', fontSize: 11 }}>高浓度</span>
          <div style={gradientStyle} />
          <span style={{ color: '#66ff66', fontSize: 11 }}>低浓度</span>
        </div>
      </div>
    </div>
  );
}

export default App;
