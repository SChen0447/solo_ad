import React from 'react';
import { useAppStore } from './store';
import type { PlantState } from './types';

interface UIControlsProps {
  plantState: PlantState | null;
  onAddObstacleMode: () => void;
  isAddingObstacle: boolean;
}

export const UIControls: React.FC<UIControlsProps> = ({
  onAddObstacleMode,
  isAddingObstacle,
}) => {
  const {
    light,
    moisture,
    temperature,
    setLight,
    setMoisture,
    setTemperature,
  } = useAppStore();

  const sliderBaseStyle: React.CSSProperties = {
    width: '100%',
    height: '8px',
    borderRadius: '8px',
    background: '#e0e0e0',
    outline: 'none',
    appearance: 'none',
    cursor: 'pointer',
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: isAddingObstacle ? '#388e3c' : '#4caf50',
    color: 'white',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.1s',
    marginTop: '16px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#333',
  };

  const valueStyle: React.CSSProperties = {
    float: 'right',
    color: '#4caf50',
    fontWeight: 600,
  };

  const controlGroupStyle: React.CSSProperties = {
    marginBottom: '20px',
  };

  return (
    <div
      style={{
        width: '240px',
        padding: '20px',
        backgroundColor: '#f5f5f5',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <h3
        style={{
          margin: '0 0 20px 0',
          color: '#2e7d32',
          fontSize: '18px',
          fontWeight: 700,
          textAlign: 'center',
        }}
      >
        环境参数控制
      </h3>

      <div style={controlGroupStyle}>
        <label style={labelStyle}>
          光照强度
          <span style={valueStyle}>{light}</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={light}
          onChange={(e) => setLight(Number(e.target.value))}
          style={sliderBaseStyle}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#888',
            marginTop: '4px',
          }}
        >
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>

      <div style={controlGroupStyle}>
        <label style={labelStyle}>
          土壤湿度
          <span style={valueStyle}>{moisture}</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={moisture}
          onChange={(e) => setMoisture(Number(e.target.value))}
          style={sliderBaseStyle}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#888',
            marginTop: '4px',
          }}
        >
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>

      <div style={controlGroupStyle}>
        <label style={labelStyle}>
          环境温度
          <span style={valueStyle}>{temperature}°C</span>
        </label>
        <input
          type="range"
          min="-5"
          max="45"
          value={temperature}
          onChange={(e) => setTemperature(Number(e.target.value))}
          style={sliderBaseStyle}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#888',
            marginTop: '4px',
          }}
        >
          <span>-5°C</span>
          <span>20°C</span>
          <span>45°C</span>
        </div>
      </div>

      <button
        onClick={onAddObstacleMode}
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = isAddingObstacle
            ? '#2e7d32'
            : '#66bb6a';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isAddingObstacle
            ? '#388e3c'
            : '#4caf50';
        }}
      >
        {isAddingObstacle ? '添加模式 (点击画布)' : '添加环境障碍物'}
      </button>

      <p
        style={{
          fontSize: '11px',
          color: '#888',
          textAlign: 'center',
          marginTop: '12px',
          marginBottom: 0,
        }}
      >
        拖动滑块实时调节植物生长参数
      </p>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #4caf50;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          background: #66bb6a;
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #4caf50;
          cursor: pointer;
          border: none;
          transition: background-color 0.2s;
        }
        input[type="range"]::-moz-range-thumb:hover {
          background: #66bb6a;
        }
      `}</style>
    </div>
  );
};
