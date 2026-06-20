import React, { useMemo } from 'react';
import { useSensorStore } from '../sensorDataModule/store.tsx';
import {
  SensorType,
  SENSOR_LABELS,
  SENSOR_UNITS,
  SENSOR_COLORS,
  SensorData,
} from '../sensorDataModule/types';

interface SensorCardProps {
  sensorType: SensorType;
}

type Trend = 'up' | 'down' | 'same';

const getTemperatureGradient = (value: number): string => {
  if (value < 20) {
    const t = Math.max(0, (value + 10) / 30);
    const r = Math.round(59 + t * 100);
    const g = Math.round(130 + t * 80);
    const b = Math.round(246 - t * 60);
    return `linear-gradient(135deg, rgba(${r},${g},${b},0.15), rgba(${r + 20},${g + 10},${b - 20},0.08))`;
  } else if (value <= 30) {
    const t = (value - 20) / 10;
    const r = Math.round(251 + t * 0);
    const g = Math.round(191 - t * 40);
    const b = Math.round(36 - t * 36);
    return `linear-gradient(135deg, rgba(${r},${g},${b},0.15), rgba(${r + 10},${g - 20},${b},0.08))`;
  } else {
    const t = Math.min(1, (value - 30) / 15);
    const r = Math.round(239 + t * 16);
    const g = Math.round(68 - t * 30);
    const b = Math.round(68 + t * 30);
    return `linear-gradient(135deg, rgba(${r},${g},${b},0.2), rgba(${r},${g - 20},${b + 10},0.1))`;
  }
};

const getHumidityGradient = (value: number): string => {
  if (value < 40) {
    const t = Math.max(0, value / 40);
    const r = Math.round(139 + t * 20);
    const g = Math.round(90 - t * 20);
    const b = Math.round(43 + t * 10);
    return `linear-gradient(135deg, rgba(${r},${g},${b},0.15), rgba(${r + 10},${g + 5},${b},0.08))`;
  } else if (value <= 70) {
    const t = (value - 40) / 30;
    const r = Math.round(34 - t * 10);
    const g = Math.round(197 - t * 50);
    const b = Math.round(94 + t * 20);
    return `linear-gradient(135deg, rgba(${r},${g},${b},0.18), rgba(${r + 10},${g - 30},${b + 10},0.1))`;
  } else {
    const t = Math.min(1, (value - 70) / 30);
    const r = Math.round(101 + t * 40);
    const g = Math.round(67 - t * 10);
    const b = Math.round(33 + t * 10);
    return `linear-gradient(135deg, rgba(${r},${g},${b},0.15), rgba(${r + 15},${g},${b},0.08))`;
  }
};

const getPressureGradient = (value: number): string => {
  const normalized = Math.max(0, Math.min(1, (value - 980) / 60));
  const r = Math.round(156 - normalized * 30);
  const g = Math.round(163 - normalized * 40);
  const b = Math.round(175 + normalized * 80);
  return `linear-gradient(135deg, rgba(${r},${g},${b},0.15), rgba(${r + 20},${g + 10},${b},0.08))`;
};

const getBackgroundGradient = (sensorType: SensorType, value: number): string => {
  switch (sensorType) {
    case 'temperature':
      return getTemperatureGradient(value);
    case 'humidity':
      return getHumidityGradient(value);
    case 'pressure':
      return getPressureGradient(value);
    default:
      return 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))';
  }
};

const ArrowIcon: React.FC<{ trend: Trend; color: string }> = ({ trend, color }) => {
  if (trend === 'up') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ transition: 'all 0.3s' }}>
        <path d="M12 5L12 19M12 5L6 11M12 5L18 11" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (trend === 'down') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ transition: 'all 0.3s' }}>
        <path d="M12 19L12 5M12 19L6 13M12 19L18 13" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ transition: 'all 0.3s' }}>
      <path d="M5 12H19" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
};

interface MiniTrendProps {
  data: number[];
  color: string;
}

const MiniTrendChart: React.FC<MiniTrendProps> = ({ data, color }) => {
  const width = 120;
  const height = 40;
  const padding = 2;

  if (data.length < 2) {
    return (
      <svg width={width} height={height}>
        <rect x="0" y="0" width={width} height={height} fill="transparent" />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((value - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`miniGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <polyline
        fill={`url(#miniGrad-${color.replace('#', '')})`}
        points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

const SensorCard: React.FC<SensorCardProps> = ({ sensorType }) => {
  const { state } = useSensorStore();

  const { currentValue, previousValue, trendData, trend } = useMemo(() => {
    const data = state.sensorData;
    const len = data.length;

    if (len === 0) {
      return { currentValue: 0, previousValue: 0, trendData: [] as number[], trend: 'same' as Trend };
    }

    const latest: SensorData = data[len - 1];
    const current = latest[sensorType];

    const prev = len >= 2 ? data[len - 2][sensorType] : current;

    let trendResult: Trend = 'same';
    if (current > prev) trendResult = 'up';
    else if (current < prev) trendResult = 'down';

    const TEN_SECONDS_MS = 10000;
    const cutoff = latest.timestamp - TEN_SECONDS_MS;
    const recentData: number[] = [];
    for (let i = len - 1; i >= 0; i--) {
      if (data[i].timestamp >= cutoff) {
        recentData.unshift(data[i][sensorType]);
      } else {
        break;
      }
    }

    return {
      currentValue: current,
      previousValue: prev,
      trendData: recentData,
      trend: trendResult,
    };
  }, [state.sensorData, sensorType]);

  const color = SENSOR_COLORS[sensorType];
  const arrowColor =
    trend === 'up' ? '#ef4444' : trend === 'down' ? '#22c55e' : '#888';
  const gradient = getBackgroundGradient(sensorType, currentValue);

  return (
    <div
      style={{
        ...styles.card,
        background: gradient,
        transition: 'background 0.4s ease, transform 0.2s ease',
      }}
    >
      <div style={styles.cardHeader}>
        <span style={styles.sensorLabel}>{SENSOR_LABELS[sensorType]}</span>
        <span
          style={{
            ...styles.sensorUnit,
            color: color,
          }}
        >
          {SENSOR_UNITS[sensorType]}
        </span>
      </div>

      <div style={styles.valueRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={styles.value}>{currentValue.toFixed(2)}</span>
          <div style={{ transition: 'opacity 0.3s' }}>
            <ArrowIcon trend={trend} color={arrowColor} />
          </div>
        </div>
      </div>

      <div style={styles.trendContainer}>
        <MiniTrendChart data={trendData} color={color} />
      </div>

      <div style={styles.footer}>
        <span style={styles.prevLabel}>上一次: {previousValue.toFixed(2)}</span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    padding: '16px',
    width: '100%',
    boxSizing: 'border-box',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  sensorLabel: {
    color: '#888',
    fontSize: '13px',
    fontWeight: 500,
  },
  sensorUnit: {
    fontSize: '12px',
    fontWeight: 600,
  },
  valueRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  value: {
    color: '#fff',
    fontSize: '28px',
    fontWeight: 700,
    lineHeight: 1,
    transition: 'all 0.3s ease',
  },
  trendContainer: {
    width: '100%',
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: '10px',
  },
  footer: {
    paddingTop: '8px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  prevLabel: {
    color: '#666',
    fontSize: '11px',
  },
};

export default SensorCard;
