import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useFeedbackStore } from '../stores/feedbackStore';
import {
  themeColors,
  themeNames,
  emotionColors,
  type Theme,
  type Emotion,
} from '../types';

const glassCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '12px',
  padding: '24px',
  backdropFilter: 'blur(10px)',
  transition: 'all 0.3s ease-out',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.9)',
  marginBottom: '16px',
};

type TrendFilter = 'all' | 'positive' | 'negative';

export const ChartsPanel: React.FC = () => {
  const themeDistribution = useFeedbackStore((state) => state.themeDistribution);
  const trendData = useFeedbackStore((state) => state.trendData);
  const [trendFilter, setTrendFilter] = useState<TrendFilter>('all');

  const pieData = useMemo(
    () =>
      themeDistribution.map((item) => ({
        name: themeNames[item.theme],
        value: item.percentage,
        count: item.count,
        theme: item.theme,
        emotion: item.emotion,
      })),
    [themeDistribution]
  );

  const formattedTrendData = useMemo(
    () =>
      trendData.map((item) => ({
        ...item,
        displayDate: item.date.slice(5),
      })),
    [trendData]
  );

  const getLineColor = () => {
    switch (trendFilter) {
      case 'positive':
        return emotionColors.positive;
      case 'negative':
        return emotionColors.negative;
      default:
        return '#0099ff';
    }
  };

  const getDataKey = () => {
    switch (trendFilter) {
      case 'positive':
        return 'positive';
      case 'negative':
        return 'negative';
      default:
        return 'total';
    }
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; count: number; theme: Theme; emotion: Emotion } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          style={{
            background: 'rgba(26, 27, 35, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '8px',
            padding: '12px',
            color: '#fff',
            minWidth: '140px',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>{data.name}</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
            占比: <span style={{ color: themeColors[data.theme] }}>{data.value}%</span>
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
            数量: <span style={{ color: '#fff' }}>{data.count} 条</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const TrendTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: 'rgba(26, 27, 35, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '8px',
            padding: '12px',
            color: '#fff',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>{label}</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
            反馈量: <span style={{ color: getLineColor(), fontWeight: 600 }}>{payload[0].value} 条</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '60% 1fr',
        gap: '20px',
        marginBottom: '24px',
      }}
      className="charts-panel"
    >
      <div style={glassCardStyle}>
        <h3 style={sectionTitleStyle}>主题分布</h3>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                isAnimationActive
                animationDuration={500}
                animationEasing="ease-out"
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={themeColors[entry.theme]}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={1}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            marginTop: '16px',
            flexWrap: 'wrap',
          }}
        >
          {pieData.map((item) => (
            <div key={item.theme} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: themeColors[item.theme],
                }}
              />
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                {item.name} {item.value}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={glassCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ ...sectionTitleStyle, marginBottom: 0 }}>30天趋势</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['all', 'positive', 'negative'] as TrendFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setTrendFilter(filter)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  transition: 'all 0.3s ease-out',
                  background:
                    trendFilter === filter
                      ? filter === 'positive'
                        ? 'linear-gradient(135deg, #00d4aa, #0099ff)'
                        : filter === 'negative'
                        ? '#ff6b35'
                        : 'linear-gradient(135deg, #00d4aa, #0099ff)'
                      : 'rgba(255,255,255,0.1)',
                  color: trendFilter === filter ? '#fff' : 'rgba(255,255,255,0.7)',
                }}
              >
                {filter === 'all' ? '全部' : filter === 'positive' ? '正面' : '负面'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedTrendData} key={trendFilter}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="displayDate"
                stroke="rgba(255,255,255,0.5)"
                tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }}
                interval={4}
              />
              <YAxis
                stroke="rgba(255,255,255,0.5)"
                tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }}
                width={30}
              />
              <Tooltip content={<TrendTooltip />} />
              <Line
                type="monotone"
                dataKey={getDataKey()}
                stroke={getLineColor()}
                strokeWidth={2}
                dot={{ fill: getLineColor(), strokeWidth: 2, r: 3 }}
                activeDot={{ r: 6, fill: getLineColor(), stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive
                animationDuration={500}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <style>{`
        @media (max-width: 1280px) {
          .charts-panel {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
