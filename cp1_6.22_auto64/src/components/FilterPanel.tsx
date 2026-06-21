import React from 'react';
import { useData } from '../context/DataContext';
import { SensorType, TimeRange } from '../types';

const sensorLabels: Record<SensorType, string> = {
  temperature: '温度',
  humidity: '湿度',
  light: '光照',
  windSpeed: '风速',
};

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: '1m', label: '最近1分钟' },
  { value: '5m', label: '最近5分钟' },
  { value: '15m', label: '最近15分钟' },
];

const FilterPanel: React.FC = () => {
  const { filter, setFilter } = useData();

  const handleSensorToggle = (sensor: SensorType) => {
    const newSensors = filter.sensors.includes(sensor)
      ? filter.sensors.filter((s) => s !== sensor)
      : [...filter.sensors, sensor];

    setFilter({
      ...filter,
      sensors: newSensors,
    });
  };

  const handleTimeRangeChange = (range: TimeRange) => {
    setFilter({
      ...filter,
      timeRange: range,
    });
  };

  return (
    <div
      style={{
        backgroundColor: '#2d3748',
        borderRadius: '8px',
        border: '2px solid #4a5568',
        padding: '16px',
        marginBottom: '16px',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
        <div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#e2e8f0',
              marginBottom: '8px',
            }}
          >
            传感器类型
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {(Object.keys(sensorLabels) as SensorType[]).map((sensor) => (
              <label
                key={sensor}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  color: '#e2e8f0',
                  fontSize: '14px',
                  transition: 'opacity 0.2s ease',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={filter.sensors.includes(sensor)}
                  onChange={() => handleSensorToggle(sensor)}
                  style={{
                    cursor: 'pointer',
                    width: '16px',
                    height: '16px',
                    accentColor: '#63b3ed',
                  }}
                />
                {sensorLabels[sensor]}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#e2e8f0',
              marginBottom: '8px',
            }}
          >
            时间范围
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {timeRangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleTimeRangeChange(option.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #4a5568',
                  backgroundColor: filter.timeRange === option.value ? '#3182ce' : 'transparent',
                  color: filter.timeRange === option.value ? '#ffffff' : '#e2e8f0',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (filter.timeRange !== option.value) {
                    e.currentTarget.style.backgroundColor = '#4a5568';
                  }
                }}
                onMouseLeave={(e) => {
                  if (filter.timeRange !== option.value) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
