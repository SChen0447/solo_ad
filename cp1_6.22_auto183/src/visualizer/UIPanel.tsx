import React, { useState, useEffect, useRef } from 'react';
import { SceneType, SceneInfo } from '@/services/WindApiService';
import { RenderParams } from './WindScene';

interface UIPanelProps {
  scenes: SceneInfo[];
  currentScene: SceneType;
  params: RenderParams;
  fps: number;
  isLoading: boolean;
  isConnected: boolean;
  performanceWarning: boolean;
  onSceneChange: (scene: SceneType) => void;
  onParamsChange: (params: Partial<RenderParams>) => void;
  onDismissWarning: () => void;
}

const panelStyles: React.CSSProperties = {
  position: 'fixed',
  top: '16px',
  left: '16px',
  width: '280px',
  background: 'rgba(26, 26, 46, 0.85)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  padding: '20px',
  color: '#e2e8f0',
  zIndex: 100,
  maxHeight: 'calc(100vh - 32px)',
  overflowY: 'auto',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
};

const labelStyles: React.CSSProperties = {
  display: 'block',
  color: '#94a3b8',
  fontSize: '12px',
  marginBottom: '8px',
  fontWeight: 500,
  letterSpacing: '0.3px',
};

const sliderContainerStyles: React.CSSProperties = {
  marginBottom: '20px',
};

const sliderStyles: React.CSSProperties = {
  width: '100%',
  height: '6px',
  WebkitAppearance: 'none',
  appearance: 'none',
  background: '#334155',
  borderRadius: '3px',
  outline: 'none',
  cursor: 'pointer',
};

const valueDisplayStyles: React.CSSProperties = {
  float: 'right',
  color: '#06b6d4',
  fontSize: '12px',
  fontWeight: 600,
};

const selectStyles: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: '#1e293b',
  color: '#e2e8f0',
  border: '1px solid #334155',
  borderRadius: '8px',
  fontSize: '14px',
  cursor: 'pointer',
  outline: 'none',
  marginBottom: '8px',
};

const sceneDescriptionStyles: React.CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
  lineHeight: 1.5,
  padding: '10px',
  background: 'rgba(30, 41, 59, 0.5)',
  borderRadius: '8px',
  marginBottom: '20px',
  border: '1px solid rgba(255, 255, 255, 0.05)',
};

const titleStyles: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#e2e8f0',
  marginBottom: '4px',
};

const subtitleStyles: React.CSSProperties = {
  fontSize: '12px',
  color: '#64748b',
  marginBottom: '24px',
};

const footerStyles: React.CSSProperties = {
  marginTop: '16px',
  paddingTop: '16px',
  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const fpsStyles = (fps: number): React.CSSProperties => ({
  fontSize: '12px',
  fontWeight: 600,
  color: fps > 30 ? '#22c55e' : fps >= 20 ? '#eab308' : '#ef4444',
});

const connectionStyles = (connected: boolean): React.CSSProperties => ({
  fontSize: '11px',
  color: connected ? '#22c55e' : '#ef4444',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
});

const warningStyles: React.CSSProperties = {
  position: 'absolute',
  top: '16px',
  right: '16px',
  left: '16px',
  background: 'rgba(239, 68, 68, 0.9)',
  color: 'white',
  padding: '12px 16px',
  borderRadius: '8px',
  fontSize: '13px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  zIndex: 200,
  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
};

const dismissButtonStyles: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.2)',
  border: 'none',
  color: 'white',
  padding: '4px 12px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '12px',
  transition: 'all 0.2s ease',
};

const spinnerStyles: React.CSSProperties = {
  width: '24px',
  height: '24px',
  border: '2px solid #334155',
  borderTop: '2px solid #06b6d4',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
};

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, step, unit = '', onChange }) => {
  const sliderRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sliderRef.current && trackRef.current) {
      const percent = ((value - min) / (max - min)) * 100;
      sliderRef.current.style.background = `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${percent}%, #334155 ${percent}%, #334155 100%)`;
    }
  }, [value, min, max]);

  return (
    <div style={sliderContainerStyles}>
      <label style={labelStyles}>
        {label}
        <span style={valueDisplayStyles}>
          {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}
          {unit}
        </span>
      </label>
      <div ref={trackRef} style={{ position: 'relative' }}>
        <input
          ref={sliderRef}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={sliderStyles}
        />
      </div>
    </div>
  );
};

const UIPanel: React.FC<UIPanelProps> = ({
  scenes,
  currentScene,
  params,
  fps,
  isLoading,
  isConnected,
  performanceWarning,
  onSceneChange,
  onParamsChange,
  onDismissWarning,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsWide(window.innerWidth >= 1200);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentSceneInfo = scenes.find((s) => s.id === currentScene);

  const panelWidthStyle: React.CSSProperties = isWide
    ? { ...panelStyles, width: '320px', boxShadow: '4px 0 32px rgba(0, 0, 0, 0.4)' }
    : panelStyles;

  const mobilePanelStyles: React.CSSProperties = isMobile
    ? {
        ...panelWidthStyle,
        top: 'auto',
        left: 0,
        right: 0,
        bottom: drawerOpen ? 0 : `-${window.innerHeight * 0.35}px`,
        width: '100%',
        maxHeight: '40vh',
        borderRadius: '16px 16px 0 0',
        transition: 'bottom 0.3s ease',
        paddingTop: drawerOpen ? '32px' : '8px',
      }
    : panelWidthStyle;

  return (
    <>
      {performanceWarning && (
        <div style={warningStyles}>
          <span>检测到性能下降，已降低粒子密度</span>
          <button
            style={dismissButtonStyles}
            onClick={onDismissWarning}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            知道了
          </button>
        </div>
      )}

      <div style={mobilePanelStyles}>
        {isMobile && (
          <div
            onClick={() => setDrawerOpen(!drawerOpen)}
            style={{
              position: 'absolute',
              top: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '60px',
              height: '6px',
              borderRadius: '3px',
              background: '#475569',
              cursor: 'pointer',
            }}
          />
        )}

        <h1 style={titleStyles}>三维风场可视化</h1>
        <p style={subtitleStyles}>3D Wind Field Visualizer</p>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyles}>场景选择</label>
          <select
            value={currentScene}
            onChange={(e) => onSceneChange(e.target.value as SceneType)}
            style={selectStyles}
          >
            {scenes.map((scene) => (
              <option key={scene.id} value={scene.id}>
                {scene.name}
              </option>
            ))}
          </select>
          {currentSceneInfo && (
            <div style={sceneDescriptionStyles}>
              <strong style={{ color: '#06b6d4' }}>{currentSceneInfo.name}：</strong>
              {currentSceneInfo.description}
            </div>
          )}
        </div>

        <Slider
          label="时间步长"
          value={params.timeStep}
          min={0.1}
          max={2.0}
          step={0.1}
          unit="秒"
          onChange={(v) => onParamsChange({ timeStep: v })}
        />

        <Slider
          label="高度层"
          value={params.heightLevel}
          min={0}
          max={5000}
          step={100}
          unit="米"
          onChange={(v) => onParamsChange({ heightLevel: v })}
        />

        <Slider
          label="粒子密度"
          value={params.particleDensity}
          min={50}
          max={200}
          step={10}
          unit="条"
          onChange={(v) => onParamsChange({ particleDensity: v })}
        />

        <div style={footerStyles}>
          <span style={fpsStyles(fps)}>
            {fps > 30 ? '●' : fps >= 20 ? '●' : '●'} {fps.toFixed(0)} FPS
          </span>
          <span style={connectionStyles(isConnected)}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isConnected ? '#22c55e' : '#ef4444',
                animation: isConnected ? 'pulse 2s infinite' : 'none',
              }}
            />
            {isConnected ? '已连接' : '连接中'}
          </span>
          {isLoading && <div style={spinnerStyles} />}
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #ffffff;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
            transition: transform 0.15s ease;
          }
          input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.15);
          }
          input[type="range"]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #ffffff;
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          }
        `}
      </style>
    </>
  );
};

export default UIPanel;
