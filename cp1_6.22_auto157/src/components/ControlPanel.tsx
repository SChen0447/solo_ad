import { useEffect, useState } from 'react';
import type { PollutionSourceConfig } from '../pollution/PollutionSource';

interface ControlPanelProps {
  sources: PollutionSourceConfig[];
  onSourceUpdate: (source: PollutionSourceConfig) => void;
  globalWindMultiplier: number;
  onWindMultiplierChange: (value: number) => void;
  onReset: () => void;
  activeParticleCount: number;
  fps: number;
}

interface SourceState {
  emissionInterval: number;
  windMultiplier: number;
}

export default function ControlPanel({
  sources,
  onSourceUpdate,
  globalWindMultiplier,
  onWindMultiplierChange,
  onReset,
  activeParticleCount,
  fps
}: ControlPanelProps) {
  const [visible, setVisible] = useState(false);
  const [sourceStates, setSourceStates] = useState<Map<string, SourceState>>(new Map());

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const newStates = new Map<string, SourceState>();
    sources.forEach((source) => {
      const existing = sourceStates.get(source.id);
      newStates.set(source.id, {
        emissionInterval: existing?.emissionInterval ?? 1000 / source.emissionRate,
        windMultiplier: existing?.windMultiplier ?? source.windMultiplier
      });
    });
    setSourceStates(newStates);
  }, [sources.length]);

  const handleEmissionChange = (sourceId: string, intervalMs: number) => {
    setSourceStates((prev) => {
      const next = new Map(prev);
      next.set(sourceId, {
        ...(next.get(sourceId) ?? { emissionInterval: 50, windMultiplier: 1.0 }),
        emissionInterval: intervalMs
      });
      return next;
    });

    const source = sources.find((s) => s.id === sourceId);
    if (source) {
      const rate = Math.max(1, Math.min(100, Math.round(1000 / intervalMs)));
      onSourceUpdate({ ...source, emissionRate: rate });
    }
  };

  const handleWindMultChange = (sourceId: string, mult: number) => {
    setSourceStates((prev) => {
      const next = new Map(prev);
      next.set(sourceId, {
        ...(next.get(sourceId) ?? { emissionInterval: 50, windMultiplier: 1.0 }),
        windMultiplier: mult
      });
      return next;
    });

    const source = sources.find((s) => s.id === sourceId);
    if (source) {
      onSourceUpdate({ ...source, windMultiplier: mult });
    }
  };

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    left: 16,
    top: 16,
    width: 280,
    maxHeight: 'calc(100vh - 32px)',
    overflowY: 'auto',
    backgroundColor: 'rgba(30, 30, 40, 0.85)',
    backdropFilter: 'blur(8px)',
    borderRadius: 8,
    padding: 16,
    color: '#e0e0e0',
    fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
    fontSize: 13,
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateX(0)' : 'translateX(-20px)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    zIndex: 100,
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#ffffff'
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#2a2a3a',
    borderRadius: 6,
    padding: 12,
    margin: '8px 0'
  };

  const sourceTitleStyle: React.CSSProperties = {
    fontWeight: 600,
    marginBottom: 8,
    color: '#f87171',
    display: 'flex',
    alignItems: 'center',
    gap: 6
  };

  const dotStyle: React.CSSProperties = {
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: '#ff3333',
    boxShadow: '0 0 8px #ff3333'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 4,
    color: '#a0a0b0',
    fontSize: 12
  };

  const valueStyle: React.CSSProperties = {
    display: 'inline-block',
    marginLeft: 6,
    color: '#3b82f6',
    fontWeight: 500
  };

  const sliderContainerStyle: React.CSSProperties = {
    marginBottom: 10
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: 6,
    appearance: 'none' as const,
    background: '#3a3a4a',
    borderRadius: 3,
    outline: 'none',
    cursor: 'pointer',
    accentColor: '#3b82f6'
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
    marginTop: 12,
    transition: 'background-color 0.2s ease',
    fontFamily: 'inherit'
  };

  const statsStyle: React.CSSProperties = {
    marginTop: 12,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 6,
    fontSize: 12
  };

  const statRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '2px 0'
  };

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>🌫️ 污染扩散控制面板</div>

      <div style={cardStyle}>
        <div style={{ fontWeight: 600, marginBottom: 8, color: '#60a5fa' }}>
          💨 全局风向参数
        </div>
        <div style={sliderContainerStyle}>
          <label style={labelStyle}>
            风速倍率
            <span style={valueStyle}>{globalWindMultiplier.toFixed(1)}x</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={globalWindMultiplier}
            onChange={(e) => onWindMultiplierChange(parseFloat(e.target.value))}
            style={sliderStyle}
          />
        </div>
        <div style={{ fontSize: 11, color: '#888899' }}>
          风向：从东向西（+X → -X）
        </div>
      </div>

      {sources.map((source) => {
        const state = sourceStates.get(source.id) ?? {
          emissionInterval: 1000 / source.emissionRate,
          windMultiplier: source.windMultiplier
        };
        return (
          <div key={source.id} style={cardStyle}>
            <div style={sourceTitleStyle}>
              <span style={dotStyle} />
              {source.name}
            </div>

            <div style={sliderContainerStyle}>
              <label style={labelStyle}>
                粒子发射间隔
                <span style={valueStyle}>{state.emissionInterval.toFixed(0)} ms</span>
              </label>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={state.emissionInterval}
                onChange={(e) =>
                  handleEmissionChange(source.id, parseFloat(e.target.value))
                }
                style={sliderStyle}
              />
            </div>

            <div style={sliderContainerStyle}>
              <label style={labelStyle}>
                风速倍率
                <span style={valueStyle}>{state.windMultiplier.toFixed(1)}x</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={state.windMultiplier}
                onChange={(e) =>
                  handleWindMultChange(source.id, parseFloat(e.target.value))
                }
                style={sliderStyle}
              />
            </div>

            <div style={{ fontSize: 11, color: '#888899', lineHeight: 1.4 }}>
              坐标：({source.position.x.toFixed(0)}, {source.position.z.toFixed(0)})
              <br />
              发射速率：{source.emissionRate} 粒子/秒
            </div>
          </div>
        );
      })}

      <button
        style={buttonStyle}
        onClick={onReset}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#dc2626')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ef4444')
        }
      >
        🔄 重置场景
      </button>

      <div style={statsStyle}>
        <div style={statRowStyle}>
          <span style={{ color: '#888899' }}>激活粒子数：</span>
          <span style={{ color: '#22d3ee', fontWeight: 500 }}>{activeParticleCount} / 5000</span>
        </div>
        <div style={statRowStyle}>
          <span style={{ color: '#888899' }}>帧率：</span>
          <span
            style={{
              color: fps >= 55 ? '#4ade80' : fps >= 30 ? '#fbbf24' : '#ef4444',
              fontWeight: 500
            }}
          >
            {fps.toFixed(0)} FPS
          </span>
        </div>
      </div>
    </div>
  );
}
