import React, { useRef, useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { SensorData } from '../types';
import { useData } from '../context/DataContext';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import html2canvas from 'html2canvas';

interface WindSpeedRadarProps {
  data: SensorData[];
}

const CustomTooltip: React.FC<any> = ({ active, payload }) => {
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
        <p style={{ marginBottom: '4px', fontWeight: 500 }}>{payload[0].payload?.timeLabel}</p>
        <p style={{ color: '#805ad5' }}>风速: {payload[0].value} m/s</p>
      </div>
    );
  }
  return null;
};

const WindSpeedRadar: React.FC<WindSpeedRadarProps> = ({ data }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const { setHoveredTimestamp } = useData();

  const currentValue = data.length > 0 ? data[data.length - 1].windSpeed : 0;
  const animatedValue = useAnimatedNumber(currentValue, 300);

  const radarData = useMemo(() => {
    if (data.length === 0) return [];

    const segments = 8;
    const segmentSize = Math.max(1, Math.floor(data.length / segments));
    const result = [];

    for (let i = 0; i < segments; i++) {
      const start = i * segmentSize;
      const end = Math.min(start + segmentSize, data.length);
      const segment = data.slice(start, end);
      const avgWindSpeed =
        segment.reduce((sum, d) => sum + d.windSpeed, 0) / segment.length;

      const startTime = new Date(data[start].timestamp);
      const timeLabel = `${startTime.getMinutes().toString().padStart(2, '0')}:${startTime
        .getSeconds()
        .toString()
        .padStart(2, '0')}`;

      result.push({
        timeLabel,
        windSpeed: parseFloat(avgWindSpeed.toFixed(1)),
        timestamp: data[start].timestamp,
      });
    }

    return result;
  }, [data]);

  const handleMouseEnter = (e: any) => {
    if (e && e.payload && e.payload.timestamp) {
      setHoveredTimestamp(e.payload.timestamp);
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
        link.download = `wind-speed-radar-${Date.now()}.png`;
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
      onMouseLeave={handleMouseLeave}
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
          风速
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
            m/s
          </span>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} outerRadius="70%">
            <defs>
              <linearGradient id="windGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#805ad5" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#b794f4" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <PolarGrid stroke="#4a5568" />
            <PolarAngleAxis
              dataKey="timeLabel"
              tick={{ fontSize: 10, fill: '#a0aec0' }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 'dataMax + 5']}
              tick={{ fontSize: 9, fill: '#a0aec0' }}
              stroke="#4a5568"
            />
            <Tooltip content={<CustomTooltip />} />
            <Radar
              name="风速"
              dataKey="windSpeed"
              stroke="#805ad5"
              strokeWidth={2}
              fill="url(#windGradient)"
              fillOpacity={0.5}
              animationDuration={400}
              onMouseEnter={handleMouseEnter}
            />
          </RadarChart>
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
        单位: m/s
      </div>
    </div>
  );
};

export default WindSpeedRadar;
