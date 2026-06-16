import React, { useState, useEffect, useRef } from 'react';
import { Adjustments, GeneratedImage } from '../services/api';

interface AdjustPanelProps {
  selectedImage: GeneratedImage | null;
  adjustments: Adjustments;
  onAdjustmentsChange: (a: Adjustments) => void;
  defaultColors: { titleColor: string; bgColor: string };
}

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  displayValue?: string;
}> = ({ label, value, min, max, step = 1, onChange, displayValue }) => {
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const percent = ((value - min) / (max - min)) * 100;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      let p = (e.clientX - rect.left) / rect.width;
      p = Math.max(0, Math.min(1, p));
      let v = min + p * (max - min);
      if (step !== 1) {
        v = Math.round(v / step) * step;
      } else {
        v = Math.round(v);
      }
      onChange(v);
    };
    const handleUp = () => setDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, min, max, step, onChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={labelTextStyle}>{label}</span>
        <span
          style={{
            fontSize: '12px',
            color: '#00B4D8',
            fontWeight: 600,
            minWidth: '28px',
            textAlign: 'right',
          }}
        >
          {displayValue ?? value}
        </span>
      </div>
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        style={{
          position: 'relative',
          height: '6px',
          background: '#4A4A6A',
          borderRadius: '3px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${percent}%`,
            background: 'linear-gradient(90deg, #0077B6, #00B4D8)',
            borderRadius: '3px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `calc(${percent}% - ${dragging ? 10 : 8}px)`,
            top: dragging ? '-7px' : '-5px',
            width: dragging ? '20px' : '16px',
            height: dragging ? '20px' : '16px',
            borderRadius: '50%',
            background: '#00B4D8',
            boxShadow: '0 2px 8px rgba(0,180,216,0.5)',
            transition: 'all 0.15s ease',
            cursor: 'grab',
          }}
        />
      </div>
    </div>
  );
};

const ColorPicker: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={labelTextStyle}>{label}</span>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#3A3A5C',
          padding: '8px 10px',
          borderRadius: '8px',
          border: '1px solid #4A4A6A',
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: value,
            border: '2px solid rgba(255,255,255,0.2)',
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              position: 'absolute',
              inset: '-10px',
              opacity: 0,
              cursor: 'pointer',
              width: 'calc(100% + 20px)',
              height: 'calc(100% + 20px)',
            }}
          />
        </div>
        <span
          style={{
            fontSize: '13px',
            color: '#FFFFFF',
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            flex: 1,
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
};

const labelTextStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#B0B0C0',
  fontWeight: 400,
};

const AdjustPanel: React.FC<AdjustPanelProps> = ({
  selectedImage,
  adjustments,
  onAdjustmentsChange,
  defaultColors,
}) => {
  const [resetPressed, setResetPressed] = useState(false);
  const disabled = !selectedImage;

  const handleReset = () => {
    onAdjustmentsChange({
      title_size: 0,
      title_color: defaultColors.titleColor,
      bg_color: defaultColors.bgColor,
      decoration_density: 1,
    });
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: '20px 16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div style={{ marginBottom: '4px' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>
          图片微调
        </div>
        <div style={{ fontSize: '11px', color: '#6A6A8A', marginTop: '2px' }}>
          {selectedImage ? `正在编辑：${selectedImage.name}` : '请先在预览区选中一张图片'}
        </div>
      </div>

      <div
        style={{
          opacity: disabled ? 0.4 : 1,
          pointerEvents: disabled ? 'none' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          marginTop: '8px',
        }}
      >
        <Slider
          label="标题文字大小"
          value={adjustments.title_size}
          min={-5}
          max={5}
          step={1}
          onChange={(v) =>
            onAdjustmentsChange({ ...adjustments, title_size: v })
          }
          displayValue={
            adjustments.title_size > 0
              ? `+${adjustments.title_size}`
              : `${adjustments.title_size}`
          }
        />

        <ColorPicker
          label="标题颜色"
          value={adjustments.title_color}
          onChange={(v) =>
            onAdjustmentsChange({ ...adjustments, title_color: v })
          }
        />

        <ColorPicker
          label="背景色"
          value={adjustments.bg_color}
          onChange={(v) =>
            onAdjustmentsChange({ ...adjustments, bg_color: v })
          }
        />

        <Slider
          label="装饰元素密度"
          value={adjustments.decoration_density}
          min={0}
          max={3}
          step={1}
          onChange={(v) =>
            onAdjustmentsChange({ ...adjustments, decoration_density: v })
          }
          displayValue={['无', '低', '中', '高'][adjustments.decoration_density] || '低'}
        />
      </div>

      <button
        onClick={handleReset}
        disabled={disabled}
        onMouseDown={() => !disabled && setResetPressed(true)}
        onMouseUp={() => setResetPressed(false)}
        onMouseLeave={() => setResetPressed(false)}
        style={{
          marginTop: '20px',
          padding: '10px 12px',
          borderRadius: '8px',
          border: '1px solid #4A4A6A',
          background: disabled ? '#2D2D44' : 'transparent',
          color: disabled ? '#6A6A8A' : '#B0B0C0',
          fontSize: '13px',
          fontWeight: 500,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          transform: resetPressed ? 'scale(0.95)' : 'scale(1)',
        }}
      >
        ↺ 重置为默认值
      </button>

      <div
        style={{
          marginTop: 'auto',
          padding: '12px',
          background: '#2D2D44',
          borderRadius: '8px',
          border: '1px solid #3A3A5C',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#FFFFFF',
            marginBottom: '6px',
          }}
        >
          💡 使用提示
        </div>
        <div style={{ fontSize: '11px', color: '#B0B0C0', lineHeight: 1.5 }}>
          调整参数后图片会自动实时更新，所有修改仅在当前会话有效，记得下载满意的版本。
        </div>
      </div>
    </div>
  );
};

export default AdjustPanel;
