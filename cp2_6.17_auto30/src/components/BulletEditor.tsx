import React from 'react';
import { BulletConfig } from '../game/Player';

interface BulletEditorProps {
  config: BulletConfig;
  onChange: (config: BulletConfig) => void;
  onReset: () => void;
  visible: boolean;
}

const BulletEditor: React.FC<BulletEditorProps> = ({ config, onChange, onReset, visible }) => {
  const handleShapeChange = (shape: 'circle' | 'star' | 'diamond') => {
    onChange({ ...config, shape });
  };

  const handleAngleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const angle = parseInt(e.target.value, 10);
    onChange({ ...config, angle });
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value, 10);
    onChange({ ...config, count });
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...config, color: e.target.value });
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '6px',
    background: '#333',
    borderRadius: '3px',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    cursor: 'pointer'
  };

  const thumbStyle = `
    .bullet-editor input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      background: #00ff88;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 0 8px rgba(0, 255, 136, 0.6);
      transition: all 0.15s ease-out;
    }
    .bullet-editor input[type="range"]::-webkit-slider-thumb:hover {
      width: 20px;
      height: 20px;
      box-shadow: 0 0 12px rgba(0, 255, 136, 0.9);
    }
    .bullet-editor input[type="range"]::-moz-range-thumb {
      width: 16px;
      height: 16px;
      background: #00ff88;
      border-radius: 50%;
      cursor: pointer;
      border: none;
      box-shadow: 0 0 8px rgba(0, 255, 136, 0.6);
      transition: all 0.15s ease-out;
    }
    .bullet-editor input[type="range"]::-moz-range-thumb:hover {
      width: 20px;
      height: 20px;
      box-shadow: 0 0 12px rgba(0, 255, 136, 0.9);
    }
  `;

  const shapeButtonBase: React.CSSProperties = {
    flex: 1,
    padding: '8px 4px',
    background: '#1a1a3e',
    border: '2px solid #333',
    borderRadius: '8px',
    color: '#aaa',
    fontFamily: 'monospace',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease-out'
  };

  const getShapeButtonStyle = (shape: string): React.CSSProperties => {
    const isActive = config.shape === shape;
    return {
      ...shapeButtonBase,
      background: isActive ? 'rgba(0, 255, 136, 0.15)' : '#1a1a3e',
      borderColor: isActive ? '#00ff88' : '#333',
      color: isActive ? '#00ff88' : '#aaa',
      boxShadow: isActive ? '0 0 10px rgba(0, 255, 136, 0.4)' : 'none'
    };
  };

  return (
    <div
      className="bullet-editor"
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        width: 280,
        background: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 12,
        padding: 20,
        backdropFilter: 'blur(4px)',
        transition: 'all 0.3s ease-out',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(20px)',
        pointerEvents: visible ? 'auto' : 'none',
        boxShadow: '0 0 20px rgba(0, 255, 255, 0.2)',
        border: '1px solid rgba(0, 255, 255, 0.3)'
      }}
    >
      <style>{thumbStyle}</style>

      <h3
        style={{
          color: '#00ffff',
          fontFamily: 'monospace',
          fontSize: 18,
          marginBottom: 20,
          textShadow: '0 0 8px rgba(0, 255, 255, 0.6)',
          letterSpacing: 1
        }}
      >
        ◆ 子弹编辑器
      </h3>

      <div style={{ marginBottom: 18 }}>
        <label
          style={{
            display: 'block',
            color: '#00ff88',
            fontFamily: 'monospace',
            fontSize: 13,
            marginBottom: 8,
            textShadow: '0 0 4px rgba(0, 255, 136, 0.4)'
          }}
        >
          子弹形状
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={getShapeButtonStyle('circle')} onClick={() => handleShapeChange('circle')}>
            ● 圆形
          </button>
          <button style={getShapeButtonStyle('star')} onClick={() => handleShapeChange('star')}>
            ★ 星形
          </button>
          <button style={getShapeButtonStyle('diamond')} onClick={() => handleShapeChange('diamond')}>
            ◆ 菱形
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label
          style={{
            display: 'block',
            color: '#00ff88',
            fontFamily: 'monospace',
            fontSize: 13,
            marginBottom: 8,
            textShadow: '0 0 4px rgba(0, 255, 136, 0.4)'
          }}
        >
          发射角度: {config.angle}°
        </label>
        <input
          type="range"
          min={0}
          max={360}
          step={15}
          value={config.angle}
          onChange={handleAngleChange}
          style={sliderStyle}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: '#666',
            fontFamily: 'monospace',
            fontSize: 10,
            marginTop: 4
          }}
        >
          <span>0°</span>
          <span>180°</span>
          <span>360°</span>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label
          style={{
            display: 'block',
            color: '#00ff88',
            fontFamily: 'monospace',
            fontSize: 13,
            marginBottom: 8,
            textShadow: '0 0 4px rgba(0, 255, 136, 0.4)'
          }}
        >
          子弹数量: {config.count}
        </label>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={config.count}
          onChange={handleCountChange}
          style={sliderStyle}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: '#666',
            fontFamily: 'monospace',
            fontSize: 10,
            marginTop: 4
          }}
        >
          <span>1</span>
          <span>5</span>
          <span>10</span>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            display: 'block',
            color: '#00ff88',
            fontFamily: 'monospace',
            fontSize: 13,
            marginBottom: 8,
            textShadow: '0 0 4px rgba(0, 255, 136, 0.4)'
          }}
        >
          子弹颜色
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="color"
            value={config.color}
            onChange={handleColorChange}
            style={{
              width: 40,
              height: 32,
              background: 'transparent',
              border: `2px solid ${config.color}`,
              borderRadius: 6,
              cursor: 'pointer',
              padding: 0,
              boxShadow: `0 0 10px ${config.color}66`
            }}
          />
          <span
            style={{
              color: config.color,
              fontFamily: 'monospace',
              fontSize: 14,
              textShadow: `0 0 6px ${config.color}88`
            }}
          >
            {config.color.toUpperCase()}
          </span>
        </div>
      </div>

      <button
        onClick={onReset}
        style={{
          width: '100%',
          padding: '10px',
          background: 'rgba(255, 51, 102, 0.15)',
          border: '2px solid #ff3366',
          borderRadius: 8,
          color: '#ff3366',
          fontFamily: 'monospace',
          fontSize: 13,
          cursor: 'pointer',
          transition: 'all 0.3s ease-out',
          textShadow: '0 0 6px rgba(255, 51, 102, 0.5)',
          boxShadow: '0 0 8px rgba(255, 51, 102, 0.3)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 51, 102, 0.3)';
          e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 51, 102, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 51, 102, 0.15)';
          e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 51, 102, 0.3)';
        }}
      >
        ↺ 重置为默认
      </button>
    </div>
  );
};

export default BulletEditor;
