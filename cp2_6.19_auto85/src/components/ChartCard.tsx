import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ChartConfig, DataRow, ChartType } from '../types';
import { CHART_COLORS } from '../types';

interface ChartCardProps {
  config: ChartConfig;
  data: DataRow[];
  onDelete: () => void;
  onRefresh: () => void;
}

const chartTypeIcons: Record<ChartType, string> = {
  line: '📈',
  bar: '📊',
  pie: '🥧',
  scatter: '⚬',
};

const chartTypeLabels: Record<ChartType, string> = {
  line: '折线图',
  bar: '柱状图',
  pie: '饼图',
  scatter: '散点图',
};

const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        pointerEvents: 'none',
      }}
    >
      {label && (
        <div style={{ fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
          {label}
        </div>
      )}
      {payload.map((entry, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#6B7280',
            marginTop: '2px',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '2px',
              background: entry.color,
              flexShrink: 0,
            }}
          />
          <span style={{ fontWeight: 500 }}>{entry.name}:</span>
          <span style={{ fontWeight: 600, color: '#1F2937' }}>
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const ChartContent: React.FC<{ config: ChartConfig; data: DataRow[] }> = React.memo(
  ({ config, data }) => {
    const { type, xAxis, yAxis, colorBy } = config;

    const aggregatedData = useMemo(() => {
      if (type === 'scatter' || type === 'line') return data;

      const map = new Map<string, Record<string, unknown>>();
      for (const row of data) {
        const key = String(row[xAxis] ?? '');
        if (!map.has(key)) {
          map.set(key, { [xAxis]: row[xAxis] });
        }
        const acc = map.get(key)!;
        for (const yCol of yAxis) {
          const val = Number(row[yCol]) || 0;
          acc[yCol] = ((acc[yCol] as number) || 0) + val;
        }
        if (colorBy && row[colorBy] != null) {
          acc[colorBy] = row[colorBy];
        }
      }
      return Array.from(map.values());
    }, [data, type, xAxis, yAxis, colorBy]);

    if (type === 'pie') {
      const pieData = aggregatedData.map((row) => ({
        name: String(row[xAxis] ?? ''),
        value: Number(row[yAxis[0]]) || 0,
      }));

      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="70%"
              animationDuration={400}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} animationDuration={100} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'scatter') {
      const yCol = yAxis[0];
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey={xAxis}
              type="number"
              name={xAxis}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
            />
            <YAxis
              dataKey={yCol}
              type="number"
              name={yCol}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
            />
            <Tooltip content={<CustomTooltip />} animationDuration={100} />
            <Scatter
              data={aggregatedData as Record<string, unknown>[]}
              fill={CHART_COLORS[0]}
              animationDuration={400}
            />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={aggregatedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey={xAxis} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <Tooltip content={<CustomTooltip />} animationDuration={100} />
            <Legend />
            {yAxis.map((col, i) => (
              <Bar
                key={col}
                dataKey={col}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                animationDuration={400}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={aggregatedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey={xAxis} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
          <Tooltip content={<CustomTooltip />} animationDuration={100} />
          <Legend />
          {yAxis.map((col, i) => (
            <Line
              key={col}
              type="monotone"
              dataKey={col}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              animationDuration={400}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  },
);

ChartContent.displayName = 'ChartContent';

const ChartCard: React.FC<ChartCardProps> = ({ config, data, onDelete, onRefresh }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [fsClosing, setFsClosing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDoubleClick = useCallback(() => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      setFsClosing(false);
    }
  }, [isFullscreen]);

  const handleCloseFullscreen = useCallback(() => {
    setFsClosing(true);
    setTimeout(() => {
      setIsFullscreen(false);
      setFsClosing(false);
    }, 300);
  }, []);

  const handleRefresh = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      onRefresh();
    },
    [onRefresh],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete();
    },
    [onDelete],
  );

  useEffect(() => {
    if (isFullscreen) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') handleCloseFullscreen();
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [isFullscreen, handleCloseFullscreen]);

  const chartElement = (
    <ChartContent config={config} data={data} />
  );

  const headerElement = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px 6px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '14px' }}>{chartTypeIcons[config.type]}</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
          {chartTypeLabels[config.type]}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={handleRefresh}
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            color: '#9CA3AF',
            transition: 'all 0.2s ease',
          }}
          title="刷新"
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = '#F3F4F6';
            (e.target as HTMLElement).style.color = '#374151';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = 'transparent';
            (e.target as HTMLElement).style.color = '#9CA3AF';
          }}
        >
          ↻
        </button>
        <button
          onClick={handleDelete}
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            color: '#9CA3AF',
            transition: 'all 0.2s ease',
          }}
          title="删除"
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = '#FEF2F2';
            (e.target as HTMLElement).style.color = '#EF4444';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = 'transparent';
            (e.target as HTMLElement).style.color = '#9CA3AF';
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: fsClosing ? 'none' : 'overlayIn 0.3s ease-out forwards',
        }}
        onClick={handleCloseFullscreen}
      >
        <div
          className={fsClosing ? 'fullscreen-exit' : 'fullscreen-enter'}
          style={{
            width: '90vw',
            height: '85vh',
            background: '#FFFFFF',
            borderRadius: '16px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {headerElement}
          <div style={{ flex: 1, padding: '0 14px 14px' }}>{chartElement}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={`chart-card-enter ${isShaking ? 'shake-animation' : ''}`}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{
        width: '100%',
        height: '100%',
        background: '#FFFFFF',
        borderRadius: '12px',
        border: `1px solid ${isHovering ? '#D1D5DB' : '#E5E7EB'}`,
        boxShadow: isHovering
          ? '0 4px 12px rgba(0, 0, 0, 0.08)'
          : '0 1px 3px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        cursor: 'default',
      }}
    >
      {headerElement}
      <div style={{ flex: 1, padding: '0 14px 10px', minHeight: 0 }}>
        {chartElement}
      </div>
    </div>
  );
};

export default React.memo(ChartCard);
