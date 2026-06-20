import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useSensorStore } from '../sensorDataModule/store.tsx';
import {
  SensorType,
  SENSOR_LABELS,
  SENSOR_COLORS,
  SENSOR_UNITS,
  SensorData,
} from '../sensorDataModule/types';

interface ChartDataPoint {
  time: string;
  temperature?: number;
  humidity?: number;
  pressure?: number;
}

const Dashboard: React.FC = () => {
  const { state } = useSensorStore();
  const [visibleSensors, setVisibleSensors] = useState<Record<SensorType, boolean>>({
    temperature: true,
    humidity: true,
    pressure: true,
  });

  const toggleSensor = (sensor: SensorType) => {
    setVisibleSensors((prev) => ({ ...prev, [sensor]: !prev[sensor] }));
  };

  const chartData: ChartDataPoint[] = useMemo(() => {
    return state.sensorData.map((d: SensorData) => ({
      time: d.time,
      temperature: visibleSensors.temperature ? d.temperature : undefined,
      humidity: visibleSensors.humidity ? d.humidity : undefined,
      pressure: visibleSensors.pressure ? d.pressure : undefined,
    }));
  }, [state.sensorData, visibleSensors]);

  const sensorTypes: SensorType[] = ['temperature', 'humidity', 'pressure'];

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: '#16213e',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          }}
        >
          <p style={{ color: '#888', margin: '0 0 8px 0', fontSize: '12px' }}>{label}</p>
          {payload.map((entry: any, index: number) => {
            const sensor = sensorTypes.find((s) => s === entry.dataKey)!;
            return (
              <p key={index} style={{ color: entry.color, margin: '4px 0', fontSize: '13px' }}>
                {SENSOR_LABELS[sensor]}: {entry.value.toFixed(2)} {SENSOR_UNITS[sensor]}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>实时传感器数据</h2>
        <div style={styles.legend}>
          {sensorTypes.map((sensor) => (
            <div
              key={sensor}
              onClick={() => toggleSensor(sensor)}
              style={{
                ...styles.legendItem,
                opacity: visibleSensors[sensor] ? 1 : 0.4,
                transition: 'opacity 0.3s ease',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  ...styles.legendDot,
                  backgroundColor: SENSOR_COLORS[sensor],
                }}
              />
              <span style={{ color: visibleSensors[sensor] ? '#fff' : '#888', fontSize: '13px' }}>
                {SENSOR_LABELS[sensor]}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div style={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="time"
              stroke="#888"
              tick={{ fill: '#888', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <YAxis
              stroke="#888"
              tick={{ fill: '#888', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <Tooltip content={customTooltip} />
            <Legend
              onClick={(e: any) => toggleSensor(e.value as SensorType)}
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value: string) => {
                const sensor = value as SensorType;
                return (
                  <span style={{ color: visibleSensors[sensor] ? '#fff' : '#888' }}>
                    {SENSOR_LABELS[sensor]}
                  </span>
                );
              }}
            />
            {sensorTypes.map((sensor) => (
              <Line
                key={sensor}
                type="monotone"
                dataKey={sensor}
                stroke={SENSOR_COLORS[sensor]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: SENSOR_COLORS[sensor] }}
                isAnimationActive={false}
                style={{
                  transition: 'opacity 0.3s ease',
                  opacity: visibleSensors[sensor] ? 1 : 0,
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#16213e',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    padding: '20px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  title: {
    color: '#fff',
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
  },
  legend: {
    display: 'flex',
    gap: '16px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    userSelect: 'none',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  chartWrapper: {
    flex: 1,
    minHeight: '300px',
  },
};

export default Dashboard;
