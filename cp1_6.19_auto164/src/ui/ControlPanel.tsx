import React, { useState, useEffect } from 'react';

interface ControlPanelProps {
  gravity: number;
  friction: number;
  emitRate: number;
  onGravityChange: (value: number) => void;
  onFrictionChange: (value: number) => void;
  onEmitRateChange: (value: number) => void;
  onClear: () => void;
  isMobile: boolean;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, unit = '', onChange }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setDisplayValue(value);
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange(newValue);
  };

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ marginBottom: '20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <span style={{ color: '#B8C5D6', fontSize: '13px', fontWeight: 500 }}>{label}</span>
        <span
          style={{
            color: '#4A90D9',
            fontSize: '14px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            transition: 'transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            transform: isAnimating ? 'scale(1.15)' : 'scale(1)',
            minWidth: '60px',
            textAlign: 'right',
          }}
        >
          {displayValue.toFixed(1)}{unit}
        </span>
      </div>
      <div style={{ position: 'relative', height: '6px' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#1A2535',
            borderRadius: '3px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${percentage}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #4A90D9, #6AB0FF)',
            borderRadius: '3px',
            transition: 'width 0.1s ease-out',
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            width: '100%',
            transform: 'translateY(-50%)',
            margin: 0,
            opacity: 0,
            cursor: 'pointer',
            height: '20px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `calc(${percentage}% - 8px)`,
            transform: 'translateY(-50%)',
            width: '16px',
            height: '16px',
            background: 'white',
            borderRadius: '50%',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
            transition: 'left 0.1s ease-out, box-shadow 0.2s ease',
          }}
        />
      </div>
    </div>
  );
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  gravity,
  friction,
  emitRate,
  onGravityChange,
  onFrictionChange,
  onEmitRateChange,
  onClear,
  isMobile,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setIsDrawerOpen(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(30, 45, 65, 0.85)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(74, 144, 217, 0.3)',
            color: '#B8C5D6',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            zIndex: 100,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateX(-50%) translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateX(-50%) translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          控制面板
        </button>

        {isDrawerOpen && (
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'rgba(20, 30, 45, 0.95)',
              backdropFilter: 'blur(20px)',
              borderTop: '1px solid rgba(74, 144, 217, 0.3)',
              borderRadius: '16px 16px 0 0',
              padding: '20px',
              zIndex: 200,
              animation: 'slideUp 0.3s ease',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '4px',
                background: '#4A90D9',
                borderRadius: '2px',
                margin: '0 auto 16px auto',
              }}
            />
            <Slider label="重力大小" value={gravity} min={1} max={20} step={0.5} unit=" m/s²" onChange={onGravityChange} />
            <Slider label="摩擦系数" value={friction} min={0.1} max={1} step={0.05} onChange={onFrictionChange} />
            <Slider label="喷射速率" value={emitRate} min={10} max={100} step={5} unit=" 颗/秒" onChange={onEmitRateChange} />
            <button
              onClick={() => {
                onClear();
                setIsDrawerOpen(false);
              }}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #E74C3C, #C0392B)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginTop: '10px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(231, 76, 60, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
            >
              清除所有颗粒
            </button>
            <button
              onClick={() => setIsDrawerOpen(false)}
              style={{
                width: '100%',
                padding: '10px',
                background: 'transparent',
                color: '#B8C5D6',
                border: '1px solid rgba(74, 144, 217, 0.3)',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                marginTop: '10px',
              }}
            >
              关闭
            </button>
          </div>
        )}

        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>
      </>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        right: '20px',
        transform: `translateY(-50%) translateX(${isVisible ? '0' : '120%'})`,
        width: '260px',
        background: 'rgba(20, 30, 45, 0.75)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(74, 144, 217, 0.25)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
        opacity: isVisible ? 1 : 0,
        zIndex: 50,
      }}
    >
      <h3
        style={{
          color: '#E8F0FA',
          fontSize: '16px',
          fontWeight: 600,
          marginBottom: '20px',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(74, 144, 217, 0.2)',
        }}
      >
        控制面板
      </h3>

      <Slider label="重力大小" value={gravity} min={1} max={20} step={0.5} unit=" m/s²" onChange={onGravityChange} />

      <Slider label="摩擦系数" value={friction} min={0.1} max={1} step={0.05} onChange={onFrictionChange} />

      <Slider label="喷射速率" value={emitRate} min={10} max={100} step={5} unit=" 颗/秒" onChange={onEmitRateChange} />

      <div style={{ marginTop: '24px' }}>
        <button
          onClick={onClear}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #E74C3C, #C0392B)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(231, 76, 60, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
        >
          清除所有颗粒
        </button>
      </div>

      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(74, 144, 217, 0.1)',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#8FA8C0',
          lineHeight: '1.6',
        }}
      >
        <p style={{ margin: 0 }}>
          <strong style={{ color: '#B8C5D6' }}>操作提示：</strong>
        </p>
        <p style={{ margin: '6px 0 0 0' }}>• 左键拖拽：旋转视角</p>
        <p style={{ margin: 0 }}>• 右键拖拽：平移视角</p>
        <p style={{ margin: 0 }}>• 滚轮：缩放</p>
        <p style={{ margin: 0 }}>• Shift+拖拽：喷射颗粒</p>
      </div>
    </div>
  );
};

export default ControlPanel;
