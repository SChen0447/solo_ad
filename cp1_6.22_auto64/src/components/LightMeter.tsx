import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
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

interface LightMeterProps {
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
        <p style={{ color: '#ecc94b' }}>光照: {payload[0].value} lux</p>
      </div>
    );
  }
  return null;
};

const LightMeter: React.FC<LightMeterProps> = ({ data }) => {
  const { hoveredTimestamp, setHoveredTimestamp } = useData();

  const currentValue = data.length > 0 ? data[data.length - 1].light : 0;
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

  return (
    <div
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
      <div style={{ marginBottom: '12px' }}>
        <div
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#63b3ed',
            marginBottom: '4px',
          }}
        >
          光照强度
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
            lux
          </span>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
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
              domain={[0, 'dataMax + 100']}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(160, 174, 192, 0.1)' }} />
            {hoveredTimestamp && (
              <ReferenceLine
                x={hoveredTimestamp}
                stroke="#a0aec0"
                strokeWidth={1}
                strokeDasharray="5 5"
              />
            )}
            <Bar
              dataKey="light"
              fill="#ecc94b"
              radius={[4, 4, 0, 0]}
              animationDuration={400}
              isAnimationActive={true}
              animationEasing="ease-out"
            />
          </BarChart>
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
        单位: lux
      </div>
    </div>
  );
};

export default LightMeter;
