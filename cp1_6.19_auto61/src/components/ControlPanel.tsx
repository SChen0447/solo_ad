import { useState, useEffect } from 'react';
import { useGalaxyStore } from '../store/galaxyStore';
import { SimulationParams, SimulationStats } from '../simulation/galaxyPhysics';

interface SliderConfig {
  key: keyof SimulationParams;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

const sliderConfigs: SliderConfig[] = [
  { key: 'particleMass', label: '质点质量', min: 0.5, max: 5.0, step: 0.1 },
  { key: 'initialAngularMomentum', label: '初始角动量', min: 0.1, max: 2.0, step: 0.1 },
  { key: 'collisionDamping', label: '碰撞阻尼系数', min: 0.0, max: 1.0, step: 0.05 },
  { key: 'darkMatterMass', label: '暗物质晕质量', min: 0, max: 10, step: 0.5 },
  { key: 'initialTemperature', label: '初始温度', min: 0.1, max: 2.0, step: 0.1 },
  { key: 'timeScale', label: '时间倍速', min: 0.5, max: 5.0, step: 0.1, unit: 'x' },
];

export default function ControlPanel() {
  const params = useGalaxyStore((state) => state.params);
  const stats = useGalaxyStore((state) => state.stats);
  const updateParams = useGalaxyStore((state) => state.updateParams);
  const isPaused = useGalaxyStore((state) => state.isPaused);
  const togglePause = useGalaxyStore((state) => state.togglePause);
  const stepCount = useGalaxyStore((state) => state.stepCount);

  const [displayStats, setDisplayStats] = useState<SimulationStats>(stats);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; sliderKey: string }[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayStats(stats);
    }, 1000);
    return () => clearInterval(interval);
  }, [stats]);

  const handleSliderChange = (key: keyof SimulationParams, value: number) => {
    updateParams({ [key]: value });
  };

  const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>, sliderKey: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    
    setRipples((prev) => [...prev, { id, x, y, sliderKey }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 300);
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    if (Math.abs(num) >= 1e6) {
      return (num / 1e6).toFixed(decimals) + 'M';
    } else if (Math.abs(num) >= 1e3) {
      return (num / 1e3).toFixed(decimals) + 'K';
    }
    return num.toFixed(decimals);
  };

  return (
    <div className="control-panel">
      <div className="panel-header">
        <h2>星系参数控制</h2>
        <button
          className={`pause-btn ${isPaused ? 'paused' : ''}`}
          onClick={togglePause}
        >
          {isPaused ? '▶ 继续' : '⏸ 暂停'}
        </button>
      </div>

      <div className="stats-panel">
        <div className="stats-title">实时模拟数据</div>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">粒子总数</span>
            <span className="stat-value">{displayStats.particleCount.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">平均速度</span>
            <span className="stat-value">{formatNumber(displayStats.averageVelocity)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">总动能</span>
            <span className="stat-value">{formatNumber(displayStats.totalKineticEnergy)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">总势能</span>
            <span className="stat-value">{formatNumber(displayStats.totalPotentialEnergy)}</span>
          </div>
        </div>
        <div className="step-counter">
          演化步数: {stepCount.toLocaleString()}
        </div>
      </div>

      <div className="sliders-container">
        {sliderConfigs.map((config) => (
          <div
            key={config.key}
            className="slider-wrapper"
            onClick={(e) => handleSliderClick(e, config.key)}
          >
            <div className="slider-header">
              <label className="slider-label">{config.label}</label>
              <span className="slider-value">
                {params[config.key].toFixed(2)}{config.unit || ''}
              </span>
            </div>
            <div className="slider-track">
              <input
                type="range"
                min={config.min}
                max={config.max}
                step={config.step}
                value={params[config.key]}
                onChange={(e) => handleSliderChange(config.key, parseFloat(e.target.value))}
                className="custom-slider"
              />
              {ripples
                .filter((r) => r.sliderKey === config.key)
                .map((ripple) => (
                  <span
                    key={ripple.id}
                    className="ripple"
                    style={{ left: ripple.x, top: ripple.y }}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .control-panel {
          width: 280px;
          padding: 20px;
          background: rgba(26, 26, 46, 0.85);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid #2a2a4e;
          border-radius: 12px;
          font-family: 'Courier New', monospace;
          color: #d0d0ff;
          display: flex;
          flex-direction: column;
          gap: 20px;
          height: fit-content;
          max-height: calc(100vh - 120px);
          overflow-y: auto;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .panel-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          letter-spacing: 1px;
        }

        .pause-btn {
          padding: 8px 16px;
          background: rgba(106, 106, 255, 0.2);
          border: 1px solid #6a6aff;
          border-radius: 6px;
          color: #d0d0ff;
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
          transition: all 0.1s ease;
        }

        .pause-btn:hover {
          background: rgba(106, 106, 255, 0.4);
          transform: scale(1.05);
        }

        .pause-btn:active {
          transform: scale(0.95);
        }

        .pause-btn.paused {
          background: rgba(106, 255, 106, 0.2);
          border-color: #6aff6a;
        }

        .stats-panel {
          background: rgba(10, 10, 26, 0.6);
          border: 1px solid #2a2a4e;
          border-radius: 8px;
          padding: 16px;
        }

        .stats-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #a0a0ff;
          letter-spacing: 1px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 11px;
          color: #8080a0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 16px;
          font-weight: 600;
          color: #e0e0ff;
        }

        .step-counter {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #2a2a4e;
          font-size: 12px;
          color: #a0a0ff;
          text-align: center;
        }

        .sliders-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .slider-wrapper {
          position: relative;
          overflow: hidden;
          border-radius: 8px;
          padding: 4px;
          transition: background 0.1s ease;
        }

        .slider-wrapper:hover {
          background: rgba(106, 106, 255, 0.1);
        }

        .slider-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .slider-label {
          font-size: 13px;
          color: #c0c0e0;
        }

        .slider-value {
          font-size: 13px;
          font-weight: 600;
          color: #8a8aff;
          font-variant-numeric: tabular-nums;
        }

        .slider-track {
          position: relative;
          width: 100%;
          height: 24px;
          display: flex;
          align-items: center;
        }

        .custom-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          background: #2a2a4e;
          border-radius: 3px;
          outline: none;
          cursor: pointer;
        }

        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: #6a6aff;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.15s ease-out;
          box-shadow: 0 0 10px rgba(106, 106, 255, 0.5);
        }

        .custom-slider::-webkit-slider-thumb:hover {
          background: #8a8aff;
          transform: scale(1.2);
          box-shadow: 0 0 15px rgba(138, 138, 255, 0.8);
        }

        .custom-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #6a6aff;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          transition: all 0.15s ease-out;
          box-shadow: 0 0 10px rgba(106, 106, 255, 0.5);
        }

        .custom-slider::-moz-range-thumb:hover {
          background: #8a8aff;
          transform: scale(1.2);
          box-shadow: 0 0 15px rgba(138, 138, 255, 0.8);
        }

        .ripple {
          position: absolute;
          width: 25px;
          height: 25px;
          background: rgba(106, 106, 255, 0.6);
          border-radius: 50%;
          transform: translate(-50%, -50%) scale(0);
          animation: ripple-animation 0.3s ease-out forwards;
          pointer-events: none;
        }

        @keyframes ripple-animation {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
        }

        @media (max-width: 768px) {
          .control-panel {
            width: 100%;
            max-height: none;
            border-radius: 12px 12px 0 0;
          }
        }
      `}</style>
    </div>
  );
}
