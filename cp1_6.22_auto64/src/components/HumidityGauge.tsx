import React, { useMemo } from 'react';
import { SensorData } from '../types';
import { useData } from '../context/DataContext';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

interface HumidityGaugeProps {
  data: SensorData[];
}

const HumidityGauge: React.FC<HumidityGaugeProps> = ({ data }) => {
  const { hoveredTimestamp, setHoveredTimestamp } = useData();

  const currentValue = data.length > 0 ? data[data.length - 1].humidity : 0;
  const animatedValue = useAnimatedNumber(currentValue, 300);

  const angle = useMemo(() => {
    return -90 + (animatedValue / 100) * 180;
  }, [animatedValue]);

  const handleHover = (e: React.MouseEvent) => {
    if (data.length > 0) {
      setHoveredTimestamp(data[data.length - 1].timestamp);
    }
  };

  const handleLeave = () => {
    setHoveredTimestamp(null);
  };

  const renderTicks = () => {
    const ticks = [];
    for (let i = 0; i <= 10; i++) {
      const angle = -90 + i * 18;
      const isMajor = i % 2 === 0;
      const outerRadius = 90;
      const innerRadius = isMajor ? 75 : 80;
      const rad = (angle * Math.PI) / 180;
      ticks.push(
        <line
          key={i}
          x1={100 + Math.cos(rad) * innerRadius}
          y1={100 + Math.sin(rad) * innerRadius}
          x2={100 + Math.cos(rad) * outerRadius}
          y2={100 + Math.sin(rad) * outerRadius}
          stroke="#63b3ed"
          strokeWidth={isMajor ? 2 : 1}
          opacity={0.6}
        />
      );
    }
    return ticks;
  };

  return (
    <div
      onMouseEnter={handleHover}
      onMouseLeave={handleLeave}
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
          湿度
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
            %
          </span>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,
        }}
      >
        <svg viewBox="0 0 200 120" style={{ width: '100%', maxHeight: '100%' }}>
          <defs>
            <linearGradient id="humidityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3182ce" />
              <stop offset="100%" stopColor="#63b3ed" />
            </linearGradient>
            <linearGradient id="humidityBgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3182ce" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#63b3ed" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="url(#humidityBgGradient)"
            strokeWidth="12"
            strokeLinecap="round"
          />

          <path
            d={`M 10 100 A 90 90 0 0 1 ${
              100 + Math.cos((angle * Math.PI) / 180) * 90
            } ${100 + Math.sin((angle * Math.PI) / 180) * 90}`}
            fill="none"
            stroke="url(#humidityGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            style={{
              transition: 'd 0.3s ease-out',
            }}
          />

          {renderTicks()}

          <g
            style={{
              transform: `rotate(${angle}deg)`,
              transformOrigin: '100px 100px',
              transition: 'transform 0.3s ease-out',
            }}
          >
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="25"
              stroke="#e2e8f0"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="100" cy="100" r="8" fill="#e2e8f0" />
            <circle cx="100" cy="100" r="4" fill="#2d3748" />
          </g>

          <text x="20" y="115" fill="#a0aec0" fontSize="10" textAnchor="middle">
            0%
          </text>
          <text x="100" y="95" fill="#a0aec0" fontSize="10" textAnchor="middle">
            50%
          </text>
          <text x="180" y="115" fill="#a0aec0" fontSize="10" textAnchor="middle">
            100%
          </text>
        </svg>
      </div>

      <div
        style={{
          textAlign: 'right',
          color: '#a0aec0',
          fontSize: '12px',
          marginTop: '8px',
        }}
      >
        单位: %
      </div>
    </div>
  );
};

export default HumidityGauge;
