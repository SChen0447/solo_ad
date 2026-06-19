import React, { useRef, useEffect, useState } from 'react';
import { SceneManager } from './SceneManager';
import InfoPanel from './InfoPanel';
import Toolbar from './Toolbar';

interface CrystalInfo {
  id: string;
  name: string;
  formula: string;
  hardness: number;
  formation: string;
  description: string;
  color: string;
}

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const [selectedCrystal, setSelectedCrystal] = useState<CrystalInfo | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const handleCrystalSelect = (crystal: CrystalInfo | null) => {
      setSelectedCrystal(crystal);
    };

    const sceneManager = new SceneManager(containerRef.current, handleCrystalSelect);
    sceneManagerRef.current = sceneManager;

    return () => {
      sceneManager.destroy();
      sceneManagerRef.current = null;
    };
  }, []);

  const handleAutoRotateChange = (value: boolean) => {
    setAutoRotate(value);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setAutoRotate(value);
    }
  };

  const handleResetView = () => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.resetCamera();
    }
  };

  const handleRandomCluster = () => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.randomizeCluster();
      setSelectedCrystal(null);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
        }}
      />

      <div
        className="title-overlay"
        style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          zIndex: 50,
          pointerEvents: 'none',
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #9b87ff, #7dd3fc, #c77dff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '6px',
            letterSpacing: '2px',
          }}
        >
          矿物晶簇探索器
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.5)',
          }}
        >
          拖拽旋转 · 滚轮缩放 · 点击晶体查看详情
        </p>
      </div>

      <InfoPanel crystal={selectedCrystal} />

      <Toolbar
        autoRotate={autoRotate}
        onAutoRotateChange={handleAutoRotateChange}
        onResetView={handleResetView}
        onRandomCluster={handleRandomCluster}
      />
    </div>
  );
};

export default App;
