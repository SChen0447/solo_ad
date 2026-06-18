import React, { useCallback, useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { useSimulationStore } from './store';
import { MeasurementPoint } from '../geology/types';

const CHART_COLORS = ['#4fc3f7', '#ff6b6b', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b', '#20c997', '#f06595'];

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
}

const ParamSlider: React.FC<SliderProps> = ({ label, value, min, max, step, onChange, unit = '°' }) => {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
        <span style={{ color: '#c0c0c0' }}>{label}</span>
        <span style={{ color: '#4fc3f7', fontFamily: 'monospace' }}>{value.toFixed(1)}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          height: '4px',
          appearance: 'none',
          background: `linear-gradient(to right, #4fc3f7 ${((value - min) / (max - min)) * 100}%, #3a3a4a ${((value - min) / (max - min)) * 100}%)`,
          borderRadius: '2px',
          outline: 'none',
          cursor: 'pointer',
        }}
      />
    </div>
  );
};

interface GlowButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  style?: React.CSSProperties;
}

const GlowButton: React.FC<GlowButtonProps> = ({ onClick, children, active, style }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? 'rgba(79,195,247,0.15)' : 'rgba(42,42,58,0.8)',
        border: `1px solid ${hovered ? '#88ccff' : active ? '#4fc3f7' : '#3a3a4a'}`,
        borderRadius: '6px',
        color: active ? '#4fc3f7' : '#c0c0c0',
        padding: '6px 14px',
        fontSize: '12px',
        fontFamily: 'monospace',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: hovered ? '0 0 8px #88ccff' : 'none',
        ...style,
      }}
    >
      {children}
    </button>
  );
};

const ControlPanel: React.FC = () => {
  const time = useSimulationStore(s => s.time);
  const isPlaying = useSimulationStore(s => s.isPlaying);
  const playbackSpeed = useSimulationStore(s => s.playbackSpeed);
  const faultParams = useSimulationStore(s => s.faultParams);
  const measurementPoints = useSimulationStore(s => s.measurementPoints);
  const userMeasurementPoints = useSimulationStore(s => s.userMeasurementPoints);
  const displacementHistory = useSimulationStore(s => s.displacementHistory);
  const panelCollapsed = useSimulationStore(s => s.panelCollapsed);

  const setTime = useSimulationStore(s => s.setTime);
  const togglePlay = useSimulationStore(s => s.togglePlay);
  const setPlaybackSpeed = useSimulationStore(s => s.setPlaybackSpeed);
  const setFaultParams = useSimulationStore(s => s.setFaultParams);
  const resetSimulation = useSimulationStore(s => s.resetSimulation);
  const setPanelCollapsed = useSimulationStore(s => s.setPanelCollapsed);

  const allPoints = [...measurementPoints, ...userMeasurementPoints];

  const displacementChartData = React.useMemo(() => {
    const timePoints: number[] = [];
    for (let t = 0; t <= 50; t += 0.5) {
      timePoints.push(t);
    }
    return timePoints.map(t => {
      const record: Record<string, number> = { time: t };
      for (const point of allPoints) {
        const hist = displacementHistory[point.id];
        if (hist) {
          const closest = hist.reduce((prev, curr) =>
            Math.abs(curr.time - t) < Math.abs(prev.time - t) ? curr : prev
          );
          record[point.id] = closest.displacement;
        }
      }
      return record;
    });
  }, [displacementHistory, allPoints]);

  const stressBarData = React.useMemo(() => {
    return allPoints.map(p => ({
      name: p.id,
      displacement: p.displacement,
      stress: Math.abs(p.stress),
      energy: p.energy,
    }));
  }, [allPoints]);

  const handleTimeChange = useCallback((v: number) => {
    setTime(v);
  }, [setTime]);

  const speedOptions = [0.2, 0.5, 1, 2];

  if (panelCollapsed) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '80px',
        background: 'rgba(28,28,42,0.95)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '20px',
        zIndex: 100,
        borderBottom: '1px solid #3a3a4a',
      }}>
        <div style={{ color: '#4fc3f7', fontFamily: 'monospace', fontSize: '14px' }}>
          时间: {time.toFixed(1)}
        </div>
        <div style={{ color: isPlaying ? '#51cf66' : '#ff6b6b', fontFamily: 'monospace', fontSize: '14px' }}>
          {isPlaying ? '▶ 播放中' : '⏸ 已暂停'}
        </div>
        <GlowButton onClick={togglePlay}>{isPlaying ? '暂停' : '播放'}</GlowButton>
        <GlowButton onClick={() => setPanelCollapsed(false)} style={{ marginLeft: 'auto' }}>
          ▼ 展开面板
        </GlowButton>
      </div>
    );
  }

  return (
    <div style={{
      width: '350px',
      minWidth: '350px',
      height: '100vh',
      background: 'rgba(28,28,42,0.85)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: '12px',
      borderRight: '1px solid #3a3a4a',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      color: '#c0c0c0',
      fontFamily: "'Courier New', monospace",
    }}>
      <div style={{
        padding: '16px 18px',
        borderBottom: '1px solid #3a3a4a',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          color: '#e0e0e0',
          fontFamily: "'Courier New', monospace",
          margin: 0,
          fontWeight: 600,
          letterSpacing: '1px',
        }}>
          断层演化模拟器
        </h1>
        <GlowButton onClick={() => setPanelCollapsed(true)} style={{ padding: '4px 8px', fontSize: '10px' }}>
          ▲ 收起
        </GlowButton>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', color: '#4fc3f7', marginBottom: '10px', fontWeight: 600 }}>
            ⏱ 时间控制
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
            <span>模拟时间</span>
            <span style={{ color: '#4fc3f7' }}>{time.toFixed(1)} / 50.0</span>
          </div>
          <input
            type="range"
            min={0}
            max={50}
            step={0.5}
            value={time}
            onChange={e => handleTimeChange(parseFloat(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              appearance: 'none',
              background: `linear-gradient(to right, #4fc3f7 ${(time / 50) * 100}%, #3a3a4a ${(time / 50) * 100}%)`,
              borderRadius: '3px',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
            <GlowButton onClick={togglePlay} active={isPlaying}>
              {isPlaying ? '⏸ 暂停' : '▶ 播放'}
            </GlowButton>
            <GlowButton onClick={resetSimulation}>↺ 重置</GlowButton>
            <div style={{ marginLeft: 'auto', fontSize: '11px', display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span style={{ color: '#888' }}>速度:</span>
              {speedOptions.map(s => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  style={{
                    background: playbackSpeed === s ? 'rgba(79,195,247,0.2)' : 'transparent',
                    border: `1px solid ${playbackSpeed === s ? '#4fc3f7' : '#3a3a4a'}`,
                    borderRadius: '3px',
                    color: playbackSpeed === s ? '#4fc3f7' : '#888',
                    padding: '2px 6px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', color: '#4fc3f7', marginBottom: '10px', fontWeight: 600 }}>
            🏔 断层参数
          </div>
          <ParamSlider
            label="走向"
            value={faultParams.strike}
            min={-90}
            max={90}
            step={1}
            onChange={v => setFaultParams({ strike: v })}
          />
          <ParamSlider
            label="倾向"
            value={faultParams.dipDirection}
            min={0}
            max={90}
            step={1}
            onChange={v => setFaultParams({ dipDirection: v })}
          />
          <ParamSlider
            label="倾角"
            value={faultParams.dipAngle}
            min={45}
            max={90}
            step={1}
            onChange={v => setFaultParams({ dipAngle: v })}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <GlowButton
              onClick={() => setFaultParams({ slipDirection: 1 })}
              active={faultParams.slipDirection >= 0}
              style={{ flex: 1 }}
            >
              正断
            </GlowButton>
            <GlowButton
              onClick={() => setFaultParams({ slipDirection: -1 })}
              active={faultParams.slipDirection < 0}
              style={{ flex: 1 }}
            >
              逆断
            </GlowButton>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', color: '#4fc3f7', marginBottom: '10px', fontWeight: 600 }}>
            📍 测量点状态
          </div>
          <div style={{
            background: '#2a2a3a',
            borderRadius: '8px',
            padding: '10px',
            maxHeight: '160px',
            overflowY: 'auto',
          }}>
            {allPoints.map(p => (
              <div key={p.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0',
                borderBottom: '1px solid #3a3a4a',
                fontSize: '11px',
              }}>
                <span style={{ color: p.isUserAdded ? '#ffaa00' : '#00ff88' }}>
                  {p.isUserAdded ? '◆' : '●'} {p.id}
                </span>
                <span style={{ color: '#4fc3f7', fontFamily: 'monospace' }}>
                  Δ{p.displacement.toFixed(2)} σ{Math.abs(p.stress).toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', color: '#4fc3f7', marginBottom: '10px', fontWeight: 600 }}>
            📈 位移-时间曲线
          </div>
          <div style={{
            background: '#2a2a3a',
            borderRadius: '8px',
            padding: '10px',
          }}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={displacementChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3a3a4a" />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={[0, 50]}
                  tick={{ fill: '#888', fontSize: 10 }}
                  label={{ value: '时间', position: 'insideBottomRight', fill: '#888', fontSize: 10 }}
                  tickCount={6}
                />
                <YAxis
                  domain={[0, 20]}
                  tick={{ fill: '#888', fontSize: 10 }}
                  label={{ value: '位移(u)', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ background: '#1c1c2a', border: '1px solid #3a3a4a', fontSize: 11 }}
                  labelStyle={{ color: '#4fc3f7' }}
                />
                {allPoints.slice(0, 8).map((p, i) => (
                  <Line
                    key={p.id}
                    type="monotone"
                    dataKey={p.id}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={1.5}
                    dot={false}
                    animationDuration={500}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', color: '#4fc3f7', marginBottom: '10px', fontWeight: 600 }}>
            🔥 应力热力图
          </div>
          <div style={{
            background: '#2a2a3a',
            borderRadius: '8px',
            padding: '10px',
          }}>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={stressBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3a3a4a" />
                <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 8 }} />
                <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#1c1c2a', border: '1px solid #3a3a4a', fontSize: 11 }}
                  labelStyle={{ color: '#4fc3f7' }}
                />
                <Bar dataKey="stress" animationDuration={500}>
                  {stressBarData.map((entry, index) => {
                    const t = Math.min(entry.stress / 20, 1);
                    const r = Math.round(t * 255);
                    const g = Math.round((1 - t) * 200);
                    return <Cell key={index} fill={`rgb(${r}, ${g}, 50)`} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ fontSize: '11px', color: '#666', textAlign: 'center', marginTop: '10px' }}>
          {isPlaying ? '' : '⏸ 暂停时可点击地表添加临时测量点'}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
