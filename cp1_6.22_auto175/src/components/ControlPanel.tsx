import React, { useRef, useState, useCallback } from 'react';
import { EnvironmentParams } from '../utils/plantEngine';

interface ControlPanelProps {
  params: EnvironmentParams;
  onChange: (params: EnvironmentParams) => void;
  onClearWithered?: () => void;
}

interface SliderProps {
  label: string;
  icon: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
  color: string;
}

const Slider: React.FC<SliderProps> = ({ label, icon, value, min, max, unit, onChange, color }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const percent = ((value - min) / (max - min)) * 100;

  const updateValueFromPosition = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    let p = (clientX - rect.left) / rect.width;
    p = Math.max(0, Math.min(1, p));
    const newVal = Math.round(min + p * (max - min));
    onChange(newVal);
  }, [min, max, onChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateValueFromPosition(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    updateValueFromPosition(e.touches[0].clientX);
  };

  React.useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => updateValueFromPosition(e.clientX);
    const handleMoveTouch = (e: TouchEvent) => updateValueFromPosition(e.touches[0].clientX);
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMoveTouch, { passive: false });
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMoveTouch);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, updateValueFromPosition]);

  return (
    <div className="slider-group">
      <div className="slider-header">
        <span className="slider-icon">{icon}</span>
        <span className="slider-label">{label}</span>
        <span className="slider-value" style={{ color }}>
          {value}{unit}
        </span>
      </div>
      <div
        ref={trackRef}
        className="slider-track"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
      >
        <div
          className="slider-fill"
          style={{
            width: `${percent}%`,
            background: color
          }}
        />
        <div
          className={`slider-thumb ${isDragging ? 'dragging' : ''}`}
          style={{
            left: `calc(${percent}% - ${isDragging ? 12 : 10}px)`,
            width: isDragging ? 24 : 20,
            height: isDragging ? 24 : 20,
            borderColor: color
          }}
        />
      </div>
    </div>
  );
};

export const ControlPanel: React.FC<ControlPanelProps> = ({ params, onChange, onClearWithered }) => {
  return (
    <div className="control-panel">
      <div className="panel-header">
        <span className="panel-icon">🌤️</span>
        <h2 className="panel-title">环境控制</h2>
      </div>

      <div className="sliders-container">
        <Slider
          label="光照强度"
          icon="☀️"
          value={params.light}
          min={0}
          max={100}
          unit="%"
          color="#f59e0b"
          onChange={(v) => onChange({ ...params, light: v })}
        />
        <Slider
          label="水分"
          icon="💧"
          value={params.water}
          min={0}
          max={100}
          unit="%"
          color="#3b82f6"
          onChange={(v) => onChange({ ...params, water: v })}
        />
        <Slider
          label="温度"
          icon="🌡️"
          value={params.temperature}
          min={10}
          max={40}
          unit="°C"
          color="#ef4444"
          onChange={(v) => onChange({ ...params, temperature: v })}
        />
      </div>

      <div className="env-preview">
        <div className="env-item">
          <span className="env-dot" style={{ background: '#f59e0b' }} />
          <span className="env-label">光照</span>
          <div className="env-bar">
            <div className="env-fill" style={{ width: `${params.light}%`, background: '#f59e0b' }} />
          </div>
        </div>
        <div className="env-item">
          <span className="env-dot" style={{ background: '#3b82f6' }} />
          <span className="env-label">水分</span>
          <div className="env-bar">
            <div className="env-fill" style={{ width: `${params.water}%`, background: '#3b82f6' }} />
          </div>
        </div>
        <div className="env-item">
          <span className="env-dot" style={{ background: '#ef4444' }} />
          <span className="env-label">温度</span>
          <div className="env-bar">
            <div
              className="env-fill"
              style={{
                width: `${((params.temperature - 10) / 30) * 100}%`,
                background: '#ef4444'
              }}
            />
          </div>
        </div>
      </div>

      {onClearWithered && (
        <button className="clear-btn" onClick={onClearWithered}>
          🗑️ 清除枯死植物
        </button>
      )}

      <style>{`
        .control-panel {
          background: #ffffff;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          max-width: 340px;
          width: 100%;
          box-sizing: border-box;
        }
        .panel-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f1f5f9;
        }
        .panel-icon { font-size: 24px; }
        .panel-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #065f46;
        }
        .sliders-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .slider-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .slider-header {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .slider-icon { font-size: 16px; }
        .slider-label {
          flex: 1;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
        }
        .slider-value {
          font-size: 13px;
          font-weight: 700;
          min-width: 48px;
          text-align: right;
        }
        .slider-track {
          position: relative;
          width: 240px;
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          user-select: none;
          touch-action: none;
        }
        .slider-fill {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          border-radius: 4px;
          transition: none;
        }
        .slider-thumb {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: white;
          border: 3px solid;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          transition: width 0.15s ease, height 0.15s ease, left 0.15s ease;
          z-index: 2;
        }
        .slider-thumb.dragging {
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .env-preview {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .env-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .env-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .env-label {
          font-size: 11px;
          color: #64748b;
          width: 32px;
          flex-shrink: 0;
        }
        .env-bar {
          flex: 1;
          height: 6px;
          background: #f1f5f9;
          border-radius: 3px;
          overflow: hidden;
        }
        .env-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.2s ease;
        }
        .clear-btn {
          margin-top: 20px;
          width: 100%;
          padding: 12px 16px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .clear-btn:hover {
          background: #059669;
        }
        .clear-btn:active {
          transform: scale(0.95);
        }
        @media (max-width: 768px) {
          .control-panel {
            max-width: 100%;
          }
          .sliders-container {
            flex-direction: column;
          }
          .slider-track {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default ControlPanel;
