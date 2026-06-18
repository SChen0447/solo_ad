import React, { useRef, useEffect, useMemo } from 'react';
import { useSeismicStore } from './store';
import {
  OBSERVATION_POINTS,
  CHART_WAVEFORM_COLOR,
  CHART_GRID_COLOR,
  CHART_TIME_RANGE,
  CHART_DISPLACEMENT_RANGE,
  CHART_BAR_WIDTH,
  STRESS_COLOR_LOW,
  STRESS_COLOR_HIGH,
  DATA_PANEL_UPDATE_INTERVAL,
} from './config';
import type { ObservationData } from './store';

interface HistoryPoint {
  time: number;
  displacement: number;
  stress: number;
}

const MAX_HISTORY = 300;

function lerpColorHex(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

const WaveformChart: React.FC<{
  data: HistoryPoint[];
  label: string;
}> = ({ data, label }) => {
  const width = 288;
  const height = 70;
  const padding = { top: 5, right: 5, bottom: 5, left: 5 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const gridLines = useMemo(() => {
    const lines: JSX.Element[] = [];
    for (let i = 0; i <= 6; i++) {
      const x = padding.left + (chartW * i) / 6;
      lines.push(
        <line
          key={`vg${i}`}
          x1={x}
          y1={padding.top}
          x2={x}
          y2={padding.top + chartH}
          stroke={CHART_GRID_COLOR}
          strokeWidth={0.5}
        />
      );
    }
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH * i) / 4;
      lines.push(
        <line
          key={`hg${i}`}
          x1={padding.left}
          y1={y}
          x2={padding.left + chartW}
          y2={y}
          stroke={CHART_GRID_COLOR}
          strokeWidth={0.5}
        />
      );
    }
    return lines;
  }, [chartW, chartH, padding.left, padding.top]);

  const wavePath = useMemo(() => {
    if (data.length < 2) return '';
    let d = '';
    for (let i = 0; i < data.length; i++) {
      const x =
        padding.left + (data[i].time / CHART_TIME_RANGE) * chartW;
      const y =
        padding.top +
        chartH -
        (Math.min(data[i].displacement, CHART_DISPLACEMENT_RANGE) /
          CHART_DISPLACEMENT_RANGE) *
          chartH;
      if (i === 0) d += `M${x},${y}`;
      else d += ` L${x},${y}`;
    }
    return d;
  }, [data, chartW, chartH, padding.left, padding.top]);

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {gridLines}
      {wavePath && (
        <path
          d={wavePath}
          fill="none"
          stroke={CHART_WAVEFORM_COLOR}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      )}
      <text
        x={padding.left + 2}
        y={padding.top + 10}
        fill="#666688"
        fontSize={8}
        fontFamily="monospace"
      >
        {label}
      </text>
      <text
        x={padding.left + chartW - 2}
        y={padding.top + chartH - 2}
        fill="#555577"
        fontSize={7}
        fontFamily="monospace"
        textAnchor="end"
      >
        t(s)
      </text>
    </svg>
  );
};

const StressChart: React.FC<{
  data: HistoryPoint[];
}> = ({ data }) => {
  const width = 288;
  const height = 25;
  const padding = { top: 2, right: 5, bottom: 2, left: 5 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const bars = useMemo(() => {
    const recent = data.slice(-Math.floor(chartW / CHART_BAR_WIDTH));
    const maxStress = Math.max(0.01, ...recent.map((d) => d.stress));
    return recent.map((d, i) => {
      const h = (d.stress / maxStress) * chartH;
      const x = padding.left + i * CHART_BAR_WIDTH;
      const y = padding.top + chartH - h;
      const t = Math.min(d.stress / maxStress, 1);
      return (
        <rect
          key={i}
          x={x}
          y={y}
          width={CHART_BAR_WIDTH - 1}
          height={Math.max(h, 1)}
          fill={lerpColorHex(STRESS_COLOR_LOW, STRESS_COLOR_HIGH, t)}
        />
      );
    });
  }, [data, chartW, chartH, padding.left, padding.top]);

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {bars}
    </svg>
  );
};

const ObservationCard: React.FC<{
  obsData: ObservationData;
  label: string;
  historyRef: React.MutableRefObject<HistoryPoint[]>;
}> = ({ obsData, label, historyRef }) => {
  if (obsData.displacement > 0 || obsData.stress > 0) {
    historyRef.current.push({
      time: obsData.displacement > 0 ? Date.now() / 1000 : 0,
      displacement: obsData.displacement,
      stress: obsData.stress,
    });
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current = historyRef.current.slice(-MAX_HISTORY);
    }
  }

  const normalizedHistory = useMemo(() => {
    if (historyRef.current.length < 2) return historyRef.current;
    const first = historyRef.current[0].time;
    return historyRef.current.map((p) => ({
      ...p,
      time: p.time - first,
    }));
  }, [historyRef.current.length]);

  return (
    <div
      style={{
        background: '#1a1a2e',
        borderRadius: '8px',
        padding: '8px',
        height: '120px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          color: '#ffffff',
          fontSize: '12px',
          fontFamily: 'monospace',
          marginBottom: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{label}</span>
        <span style={{ color: '#6699ff', fontSize: '10px' }}>
          D:{obsData.displacement.toFixed(2)} S:{obsData.stress.toFixed(1)}
        </span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <WaveformChart data={normalizedHistory} label="位移" />
      </div>
      <div style={{ overflow: 'hidden' }}>
        <StressChart data={normalizedHistory} />
      </div>
    </div>
  );
};

const DataPanel: React.FC = () => {
  const snapshot = useSeismicStore((s) => s.snapshot);
  const fps = useSeismicStore((s) => s.fps);
  const currentTime = useSeismicStore((s) => s.currentTime);

  const historyRefs = useRef<React.MutableRefObject<HistoryPoint[]>[]>(
    OBSERVATION_POINTS.map(() => ({ current: [] as HistoryPoint[] }))
  );

  const lastUpdateTime = useRef<number>(0);
  const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = performance.now();
      if (now - lastUpdateTime.current >= DATA_PANEL_UPDATE_INTERVAL) {
        lastUpdateTime.current = now;
        forceUpdate();
      }
    }, DATA_PANEL_UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const obsData = snapshot?.observationData || [];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '320px',
        height: '100%',
        background: 'rgba(18, 18, 30, 0.9)',
        backdropFilter: 'blur(8px)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        zIndex: 100,
        overflowY: 'auto',
      }}
    >
      <style>{`
        div::-webkit-scrollbar { width: 4px; }
        div::-webkit-scrollbar-track { background: transparent; }
        div::-webkit-scrollbar-thumb { background: #555555; border-radius: 2px; }
        div::-webkit-scrollbar-thumb:hover { background: #777777; }
      `}</style>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '4px',
        }}
      >
        <span style={{ color: '#6699ff', fontSize: '14px', fontFamily: 'monospace', fontWeight: 'bold' }}>
          数据监控
        </span>
        <span style={{ color: '#555577', fontSize: '10px', fontFamily: 'monospace' }}>
          {fps} FPS
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          marginBottom: '4px',
        }}
      >
        <div
          style={{
            background: '#1a1a2e',
            borderRadius: '6px',
            padding: '8px',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#888899', fontSize: '9px', fontFamily: 'monospace' }}>
            时间
          </div>
          <div style={{ color: '#00ccff', fontSize: '16px', fontFamily: 'monospace', fontWeight: 'bold' }}>
            {currentTime.toFixed(1)}s
          </div>
        </div>
        <div
          style={{
            background: '#1a1a2e',
            borderRadius: '6px',
            padding: '8px',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#888899', fontSize: '9px', fontFamily: 'monospace' }}>
            最大位移
          </div>
          <div style={{ color: '#ff6644', fontSize: '16px', fontFamily: 'monospace', fontWeight: 'bold' }}>
            {(snapshot?.maxDisplacement || 0).toFixed(3)}
          </div>
        </div>
      </div>

      <div style={{ color: '#8888aa', fontSize: '10px', fontFamily: 'monospace', marginBottom: '2px' }}>
        观测点波形
      </div>

      {OBSERVATION_POINTS.map((pt, i) => (
        <ObservationCard
          key={pt.id}
          obsData={obsData[i] || { id: pt.id, displacement: 0, stress: 0, history: [] }}
          label={pt.label}
          historyRef={historyRefs.current[i]}
        />
      ))}
    </div>
  );
};

export default DataPanel;
