import { useState, useCallback } from 'react';
import { usePlantStore } from '../store/usePlantStore';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  gradientFrom: string;
  gradientTo: string;
  icon: string;
  onChange: (value: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

function CustomSlider({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  gradientFrom,
  gradientTo,
  icon,
  onChange,
  onDragStart,
  onDragEnd,
}: SliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHover, setIsHover] = useState(false);
  const percent = ((value - min) / (max - min)) * 100;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(parseFloat(e.target.value));
    },
    [onChange]
  );

  const handleMouseDown = () => {
    setIsDragging(true);
    onDragStart?.();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    onDragEnd?.();
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#5d4037' }}>{label}</span>
        </div>
        <div
          style={{
            background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
            color: '#fff',
            padding: '3px 10px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            minWidth: 52,
            textAlign: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          }}
        >
          {value.toFixed(0)}{unit}
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          height: 14,
          borderRadius: 7,
          background: '#e8dcc8',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${percent}%`,
            borderRadius: 7,
            background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`,
            transition: isDragging ? 'none' : 'width 0.15s ease',
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          onMouseEnter={() => setIsHover(true)}
          onMouseLeave={() => setIsHover(false)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            margin: 0,
            opacity: 0,
            cursor: 'pointer',
            WebkitAppearance: 'none',
            appearance: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `calc(${percent}% - 14px)`,
            width: 28,
            height: 28,
            borderRadius: 8,
            transform: 'translateY(-50%)',
            background: `linear-gradient(135deg, #ffffff, #f5f5f5)`,
            border: `3px solid ${gradientTo}`,
            boxShadow: isDragging || isHover
              ? `0 0 0 6px ${gradientTo}33, 0 4px 12px rgba(0,0,0,0.2)`
              : '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'box-shadow 0.15s ease, left 0.15s ease',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}

function ActionButton({ children, onClick, primary = true }: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        width: '100%',
        padding: '14px 20px',
        borderRadius: 14,
        border: 'none',
        cursor: 'pointer',
        fontSize: 15,
        fontWeight: 700,
        color: primary ? '#fff' : '#5d4037',
        background: primary
          ? 'linear-gradient(135deg, #8bc34a 0%, #689f38 100%)'
          : 'linear-gradient(135deg, #fff8e7 0%, #f5edd6 100%)',
        boxShadow: pressed
          ? 'inset 0 2px 6px rgba(0,0,0,0.15)'
          : primary
          ? '0 4px 14px rgba(139, 195, 74, 0.4)'
          : '0 2px 8px rgba(0,0,0,0.08)',
        transform: pressed ? 'scale(0.96)' : 'scale(1)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        letterSpacing: 1,
      }}
    >
      {children}
    </button>
  );
}

export default function ControlPanel() {
  const currentLight = usePlantStore((s) => s.currentLight);
  const currentWater = usePlantStore((s) => s.currentWater);
  const currentWind = usePlantStore((s) => s.currentWind);
  const setCurrentLight = usePlantStore((s) => s.setCurrentLight);
  const setCurrentWater = usePlantStore((s) => s.setCurrentWater);
  const setCurrentWind = usePlantStore((s) => s.setCurrentWind);
  const setWindDragging = usePlantStore((s) => s.setWindDragging);
  const generatePlant = usePlantStore((s) => s.generatePlant);
  const plants = usePlantStore((s) => s.plants);

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #fff8e7 0%, #faf0d7 100%)',
        borderLeft: '3px solid #d7ccc8',
        padding: 24,
        height: '100%',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 26 }}>🌿</span>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#5d4037',
              margin: 0,
              letterSpacing: 0.5,
            }}
          >
            园艺控制台
          </h2>
        </div>
        <p style={{ fontSize: 12, color: '#8d6e63', margin: 0, lineHeight: 1.5 }}>
          调整参数后点击「生成植物」，观察生长过程
        </p>
      </div>

      <div
        style={{
          background: 'rgba(255,255,255,0.6)',
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
          border: '1px solid #efebe9',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#6d4c41' }}>🌱 植物状态</span>
          <span
            style={{
              fontSize: 11,
              color: '#8bc34a',
              background: '#f1f8e9',
              padding: '2px 8px',
              borderRadius: 10,
              fontWeight: 600,
            }}
          >
            {plants.length}/5 株
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: i < plants.length ? 'linear-gradient(135deg, #a5d6a7, #81c784)' : '#e8dcc8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                opacity: i < plants.length ? 1 : 0.5,
                transition: 'all 0.3s ease',
              }}
            >
              {i < plants.length ? '🌱' : '·'}
            </div>
          ))}
        </div>
      </div>

      <CustomSlider
        label="光照强度"
        value={currentLight}
        min={0}
        max={100}
        step={1}
        unit="%"
        gradientFrom="#ffd54f"
        gradientTo="#ff8a65"
        icon="☀️"
        onChange={setCurrentLight}
      />

      <CustomSlider
        label="水分供给"
        value={currentWater}
        min={0}
        max={100}
        step={1}
        unit="%"
        gradientFrom="#4fc3f7"
        gradientTo="#29b6f6"
        icon="💧"
        onChange={setCurrentWater}
      />

      <CustomSlider
        label="风力等级"
        value={currentWind}
        min={0}
        max={10}
        step={1}
        unit="级"
        gradientFrom="#b0bec5"
        gradientTo="#78909c"
        icon="🍃"
        onChange={setCurrentWind}
        onDragStart={() => setWindDragging(true)}
        onDragEnd={() => setWindDragging(false)}
      />

      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <ActionButton onClick={() => generatePlant()}>🌻 生成植物</ActionButton>
        <ActionButton
          primary={false}
          onClick={() => {
            setCurrentLight(70);
            setCurrentWater(50);
            setCurrentWind(3);
          }}
        >
          ↺ 重置参数
        </ActionButton>
      </div>

      <div
        style={{
          marginTop: 28,
          padding: 14,
          background: 'rgba(139, 195, 74, 0.08)',
          borderRadius: 12,
          border: '1px dashed #c5e1a5',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: '#689f38', marginBottom: 8 }}>💡 使用提示</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: '#8d6e63', lineHeight: 1.8 }}>
          <li>点击地面生成水洼，植物更饱满</li>
          <li>拖动风力滑块观察摆动效果</li>
          <li>点击叶片/花朵查看生长参数</li>
        </ul>
      </div>
    </div>
  );
}
