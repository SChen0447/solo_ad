import React from 'react';

interface ControlPanelProps {
  gravity: number;
  stiffness: number;
  damping: number;
  ballCount: number;
  onGravityChange: (value: number) => void;
  onStiffnessChange: (value: number) => void;
  onDampingChange: (value: number) => void;
  onBallCountChange: (value: number) => void;
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '6px',
  borderRadius: '3px',
  background: 'rgba(255, 255, 255, 0.1)',
  outline: 'none',
  appearance: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const sliderThumbStyle = `
  .control-panel input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    borderRadius: 50%;
    background: linear-gradient(145deg, #64b5f6, #42a5f5);
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .control-panel input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 3px 10px rgba(66, 165, 245, 0.5);
  }
  .control-panel input[type="range"]::-webkit-slider-thumb:active {
    transform: scale(0.95);
  }
  .control-panel input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: linear-gradient(145deg, #64b5f6, #42a5f5);
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }
`;

export const ControlPanel: React.FC<ControlPanelProps> = ({
  gravity,
  stiffness,
  damping,
  ballCount,
  onGravityChange,
  onStiffnessChange,
  onDampingChange,
  onBallCountChange,
}) => {
  return (
    <div
      className="control-panel"
      style={{
        width: '260px',
        padding: '20px',
        background: 'rgba(30, 30, 50, 0.7)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <style>{sliderThumbStyle}</style>

      <h2
        style={{
          color: '#90caf9',
          fontSize: '18px',
          fontWeight: 600,
          margin: 0,
          textAlign: 'center',
          letterSpacing: '1px',
        }}
      >
        控制面板
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label
          style={{
            color: '#bbdefb',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>重力加速度</span>
          <span style={{ color: '#64b5f6', fontWeight: 500 }}>{gravity.toFixed(1)} m/s²</span>
        </label>
        <input
          type="range"
          min="0"
          max="50"
          step="0.1"
          value={gravity}
          onChange={(e) => onGravityChange(parseFloat(e.target.value))}
          style={sliderStyle}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label
          style={{
            color: '#bbdefb',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>弹簧刚度</span>
          <span style={{ color: '#64b5f6', fontWeight: 500 }}>{stiffness}</span>
        </label>
        <input
          type="range"
          min="1"
          max="100"
          step="1"
          value={stiffness}
          onChange={(e) => onStiffnessChange(parseInt(e.target.value))}
          style={sliderStyle}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label
          style={{
            color: '#bbdefb',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>阻尼系数</span>
          <span style={{ color: '#64b5f6', fontWeight: 500 }}>{damping.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="0.9"
          max="0.99"
          step="0.01"
          value={damping}
          onChange={(e) => onDampingChange(parseFloat(e.target.value))}
          style={sliderStyle}
        />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginTop: '8px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <label
          style={{
            color: '#bbdefb',
            fontSize: '13px',
            textAlign: 'center',
          }}
        >
          碰撞球数量
        </label>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => onBallCountChange(Math.max(1, ballCount - 1))}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: 'none',
              background: 'linear-gradient(145deg, #ff6b6b, #ee5a5a)',
              color: 'white',
              fontSize: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(238, 90, 90, 0.4)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseDown={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'scale(0.9)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 1px 4px rgba(238, 90, 90, 0.4)';
            }}
            onMouseUp={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'scale(1)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 3px 10px rgba(238, 90, 90, 0.4)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'scale(1)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 3px 10px rgba(238, 90, 90, 0.4)';
            }}
          >
            −
          </button>
          <span
            style={{
              color: '#90caf9',
              fontSize: '24px',
              fontWeight: 'bold',
              minWidth: '40px',
              textAlign: 'center',
            }}
          >
            {ballCount}
          </span>
          <button
            onClick={() => onBallCountChange(Math.min(20, ballCount + 1))}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: 'none',
              background: 'linear-gradient(145deg, #66bb6a, #4caf50)',
              color: 'white',
              fontSize: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(76, 175, 80, 0.4)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseDown={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'scale(0.9)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 1px 4px rgba(76, 175, 80, 0.4)';
            }}
            onMouseUp={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'scale(1)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 3px 10px rgba(76, 175, 80, 0.4)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'scale(1)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 3px 10px rgba(76, 175, 80, 0.4)';
            }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};
