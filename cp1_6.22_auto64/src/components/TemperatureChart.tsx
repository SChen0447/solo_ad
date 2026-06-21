import React, { useRef, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { SensorData } from '../types';
import { useData } from '../context/DataContext';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import html2canvas from 'html2canvas';

interface TemperatureChartProps {
  data: SensorData[];
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '8px 12px',
          boxShadow: '0 4px 12px rgba(45, 55, 72, 0.2)',
          color: '#2d3748',
          fontSize: '12px',
        }}
      >
        <p style={{ marginBottom: '4px', fontWeight: 500 }}>
          {new Date(parseInt(label)).toLocaleTimeString()}
        </p>
        <p style={{ color: '#ed8936' }}>温度: {payload[0].value}°C</p>
      </div>
    );
  }
  return null;
};

const TemperatureChart: React.FC<TemperatureChartProps> = ({ data }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const { hoveredTimestamp, setHoveredTimestamp } = useData();

  const currentValue = data.length > 0 ? data[data.length - 1].temperature : 0;
  const animatedValue = useAnimatedNumber(currentValue, 300);

  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      time: item.timestamp,
    }));
  }, [data]);

  const handleMouseMove = (e: any) => {
    if (e && e.activeTooltipIndex !== undefined && chartData[e.activeTooltipIndex]) {
      setHoveredTimestamp(chartData[e.activeTooltipIndex].timestamp);
    }
  };

  const handleMouseLeave = () => {
    setHoveredTimestamp(null);
  };

  const handleExport = async () => {
    if (chartRef.current) {
      try {
        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: '#2d3748',
          scale: 2,
        });
        const link = document.createElement('a');
        link.download = `temperature-chart-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        console.error('Export failed:', err);
      }
    }
  };

  return (
    <div
      ref={chartRef}
      style={{
        backgroundColor: '#2d3748',
        borderRadius: '8px',
        border: '2px solid #4a5568',
        padding: '16px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
    >
      <button
        onClick={handleExport}
        title="导出图片"
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '4px',
          transition: 'background-color 0.2s ease',
          color: '#a0aec0',
          fontSize: '18px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#4a5568';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        ⬇
      </button>

      <div style={{ marginBottom: '12px' }}>
        <div
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#63b3ed',
            marginBottom: '4px',
          }}
        >
          温度
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#f6e05e',
            }}
          >
            {animatedValue.toFixed(1)}
          </span>
          <span
            style={{
              marginLeft: '4px',
              color: '#a0aec0',
              fontSize: '14px',
            }}
          >
            °C
          </span>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ed8936" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#f6ad55" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
            <XAxis
              dataKey="time"
              stroke="#a0aec0"
              tick={{ fontSize: 10, fill: '#a0aec0' }}
              tickFormatter={(value) =>
                new Date(value).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              }
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#a0aec0"
              tick={{ fontSize: 10, fill: '#a0aec0' }}
              domain={['dataMin - 2', 'dataMax + 2']}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#a0aec0', strokeWidth: 1, strokeDasharray: '5 5' }} />
            {hoveredTimestamp && (
              <ReferenceLine
                x={hoveredTimestamp}
                stroke="#a0aec0"
                strokeWidth={1}
                strokeDasharray="5 5"
              />
            )}
            <Area
              type="monotone"
              dataKey="temperature"
              stroke="#ed8936"
              strokeWidth={2}
              fill="url(#tempGradient)"
              animationDuration={400}
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          textAlign: 'right',
          color: '#a0aec0',
          fontSize: '12px',
          marginTop: '8px',
        }}
      >
        单位: °C
      </div>
    </div>
  );
};

export default TemperatureChart;
