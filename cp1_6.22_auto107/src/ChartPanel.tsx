import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChartData } from './MarkdownParser';
import { Theme } from './themes';

interface ChartPanelProps {
  chartData: ChartData | null;
  theme: Theme;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);

    return (
      <div
        style={{
          backgroundColor: '#2d3748',
          color: '#ffffff',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '11px',
          opacity: 0.95,
          animation: 'fadeIn 200ms ease-in-out',
        }}
      >
        <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ margin: '2px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: entry.color,
                display: 'inline-block',
              }}
            />
            <span>{entry.name}: {entry.value}</span>
            {total > 0 && (
              <span style={{ opacity: 0.8 }}>
                ({((entry.value / total) * 100).toFixed(1)}%)
              </span>
            )}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PieCustomTooltip: React.FC<any> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const total = payload[0].payload?.__total || 0;
    const percent = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;

    return (
      <div
        style={{
          backgroundColor: '#2d3748',
          color: '#ffffff',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '11px',
          opacity: 0.95,
          animation: 'fadeIn 200ms ease-in-out',
        }}
      >
        <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>{data.name}</p>
        <p style={{ margin: '2px 0' }}>数值: {data.value}</p>
        <p style={{ margin: '2px 0', opacity: 0.8 }}>占比: {percent}%</p>
      </div>
    );
  }
  return null;
};

const ChartPanel: React.FC<ChartPanelProps> = ({ chartData, theme }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  React.useEffect(() => {
    if (chartData) {
      setIsVisible(false);
      setAnimationKey((k) => k + 1);
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [chartData, theme]);

  const pieDataWithTotal = useMemo(() => {
    if (!chartData || chartData.type !== 'pie') return [];
    const total = chartData.data.reduce((sum, item) => sum + (item[chartData.keys[0]] as number || 0), 0);
    return chartData.data.map((item) => ({
      ...item,
      value: item[chartData.keys[0]] as number,
      __total: total,
    }));
  }, [chartData]);

  const panelStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    borderRadius: '8px',
    background: theme.background,
    transition: 'background 400ms ease-in-out',
    minHeight: '400px',
    boxSizing: 'border-box',
    overflow: 'hidden',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: '16px',
    textAlign: 'center',
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'scale(1)' : 'scale(0.9)',
    transition: 'all 600ms ease-out',
  };

  const chartContainerStyle: React.CSSProperties = {
    flex: 1,
    minHeight: '300px',
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'scale(1)' : 'scale(0.8)',
    transition: 'all 600ms ease-out',
  };

  const emptyStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '16px',
  };

  const renderChart = () => {
    if (!chartData || chartData.data.length === 0) {
      return <div style={emptyStyle}>请输入数据并点击"生成图表"</div>;
    }

    const { type, data, keys } = chartData;

    if (type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart key={animationKey} data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="name" stroke="#e2e8f0" tick={{ fill: '#e2e8f0', fontSize: 12 }} />
            <YAxis stroke="#e2e8f0" tick={{ fill: '#e2e8f0', fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.1)' }} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ color: '#e2e8f0', fontSize: '12px' }}
            />
            {keys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={theme.colors[index % theme.colors.length]}
                radius={[4, 4, 0, 0]}
                animationDuration={600}
                animationBegin={0}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'line') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart key={animationKey} data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="name" stroke="#e2e8f0" tick={{ fill: '#e2e8f0', fontSize: 12 }} />
            <YAxis stroke="#e2e8f0" tick={{ fill: '#e2e8f0', fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ color: '#e2e8f0', fontSize: '12px' }}
            />
            {keys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={theme.colors[index % theme.colors.length]}
                strokeWidth={2}
                dot={{ r: 4, fill: theme.colors[index % theme.colors.length] }}
                activeDot={{ r: 6 }}
                animationDuration={600}
                animationBegin={0}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'pie') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart key={animationKey}>
            <Pie
              data={pieDataWithTotal}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={40}
              animationDuration={600}
              animationBegin={0}
            >
              {pieDataWithTotal.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={theme.colors[index % theme.colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<PieCustomTooltip />} />
            <Legend
              verticalAlign="middle"
              align="right"
              iconType="circle"
              iconSize={8}
              layout="vertical"
              wrapperStyle={{ color: '#e2e8f0', fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>{chartData?.title || '动态信息图表'}</div>
      <div style={chartContainerStyle}>{renderChart()}</div>
    </div>
  );
};

export default ChartPanel;
