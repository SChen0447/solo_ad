import React, { useState, useEffect } from 'react';
import PixelPlant from './PixelPlant';
import ControlPanel from './ControlPanel';
import { usePlantStore, STAGES } from './store';

interface StatBarProps {
  label: string;
  value: number;
  color: string;
}

const StatBar: React.FC<StatBarProps> = ({ label, value, color }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '13px', color: '#555', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>{value}%</span>
    </div>
    <div
      style={{
        width: '100%',
        height: '16px',
        background: '#e0e0e0',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${value}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: '4px',
          transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </div>
  </div>
);

const StatusPanel: React.FC = () => {
  const water = usePlantStore((s) => s.water);
  const light = usePlantStore((s) => s.light);
  const fertilizer = usePlantStore((s) => s.fertilizer);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="status-panel-toggle"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'none',
          position: 'fixed',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '36px',
          height: '48px',
          borderRadius: '8px 0 0 8px',
          background: 'rgba(255,255,255,0.9)',
          border: 'none',
          boxShadow: '-2px 2px 8px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          zIndex: 50,
          fontSize: '18px',
          color: '#666',
        }}
      >
        {isOpen ? '›' : '‹'}
      </button>

      <div
        className="status-panel"
        style={{
          position: 'relative',
          width: '200px',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          transition: 'transform 0.3s ease',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#333' }}>植物状态</span>
        </div>
        <StatBar label="💧 水分" value={water} color="#4fc3f7" />
        <StatBar label="☀️ 光照" value={light} color="#fff176" />
        <StatBar label="🌱 肥料" value={fertilizer} color="#81c784" />
      </div>

      <style>{`
        @media (max-width: 480px) {
          .status-panel-toggle {
            display: block !important;
          }
          .status-panel {
            position: fixed !important;
            right: 0 !important;
            top: 0 !important;
            height: 100vh !important;
            border-radius: 0 !important;
            z-index: 40;
            transform: translateX(${isOpen ? '0' : '100%'}) !important;
            padding-top: 60px !important;
            box-shadow: -4px 0 20px rgba(0,0,0,0.1) !important;
          }
        }
      `}</style>
    </>
  );
};

const App: React.FC = () => {
  const stage = usePlantStore((s) => s.stage);
  const operations = usePlantStore((s) => s.operations);
  const water = usePlantStore((s) => s.water);
  const light = usePlantStore((s) => s.light);
  const fertilizer = usePlantStore((s) => s.fertilizer);
  const isUpgrading = usePlantStore((s) => s.isUpgrading);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, []);

  const stageInfo = STAGES[stage];
  const progressPercent = Math.min(100, (operations / stageInfo.requiredOperations) * 100);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #a8e6cf 0%, #dcedc1 100%)',
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '11px', color: '#666', fontWeight: 600 }}>
            阶段 {stage + 1}/{STAGES.length}
          </span>
          <div
            style={{
              width: '200px',
              height: '12px',
              background: '#e0e0e0',
              borderRadius: '6px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #e0e0e0, #ffeb3b)',
                borderRadius: '6px',
                transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>
        </div>

        <div
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#333333',
            textAlign: 'center',
            padding: '6px 16px',
            background: 'rgba(255, 255, 255, 0.6)',
            borderRadius: '20px',
            backdropFilter: 'blur(8px)',
          }}
        >
          {stageInfo.name}
        </div>
      </div>

      <div
        className="main-content"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '32px',
          padding: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <PixelPlant
            stage={stage}
            water={water}
            light={light}
            fertilizer={fertilizer}
            isUpgrading={isUpgrading}
          />
          <div
            style={{
              marginTop: '16px',
              fontSize: '12px',
              color: '#666',
              textAlign: 'center',
              maxWidth: '280px',
              lineHeight: 1.5,
            }}
          >
            还需 {Math.max(0, stageInfo.requiredOperations - operations)} 次操作进入下一阶段
          </div>
        </div>

        <StatusPanel />
      </div>

      <div
        style={{
          padding: '16px',
          paddingBottom: '32px',
        }}
      >
        <ControlPanel />
      </div>

      <style>{`
        @media (max-width: 480px) {
          .main-content {
            gap: 0 !important;
            padding: 12px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
