import React, { useState, useRef, useEffect } from 'react';
import { useParticleStore } from '@/store/useParticleStore';
import { PRESET_CONFIGS } from '@/utils/presets';
import { PresetMode, SizeCurve, SIZE_CURVE_LABELS } from '@/types';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, onChange, unit = '' }) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ color: '#cccccc', fontSize: '13px', fontWeight: 500 }}>{label}</span>
        <span
          style={{
            color: '#64B5F6',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'monospace',
          }}
        >
          {value.toFixed(step < 1 ? 1 : 0)}
          {unit}
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
            background: 'linear-gradient(90deg, #2196F3, #64B5F6)',
            borderRadius: '3px',
            opacity: 0.3,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${percentage}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #2196F3, #64B5F6)',
            borderRadius: '3px',
            transition: 'width 0.1s ease',
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
            margin: 0,
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '4px',
          fontSize: '10px',
          color: '#666666',
        }}
      >
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 600);
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ color: '#cccccc', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
        {label}
      </div>
      <div
        ref={pickerRef}
        style={{
          position: 'relative',
          display: 'inline-block',
        }}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            backgroundColor: value,
            border: `3px solid ${isPulsing ? '#64B5F6' : 'rgba(255,255,255,0.2)'}`,
            cursor: 'pointer',
            boxShadow: isPulsing
              ? `0 0 20px ${value}, 0 0 40px ${value}`
              : `0 0 10px ${value}40`,
            transition: 'all 0.3s ease',
            animation: isPulsing ? 'pulse 0.6s ease-out' : 'none',
          }}
        />
        {isOpen && (
          <div
            style={{
              position: 'absolute',
              top: '60px',
              left: 0,
              zIndex: 1000,
              background: 'rgba(20, 20, 40, 0.95)',
              borderRadius: '12px',
              padding: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            }}
          >
            <input
              type="color"
              value={value}
              onChange={handleColorChange}
              style={{
                width: '200px',
                height: '200px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                background: 'transparent',
              }}
            />
          </div>
        )}
      </div>
      <div
        style={{
          marginTop: '8px',
          fontSize: '12px',
          color: '#888888',
          fontFamily: 'monospace',
        }}
      >
        {value.toUpperCase()}
      </div>
    </div>
  );
};

interface SectionProps {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<SectionProps> = ({ title, collapsed, onToggle, children }) => {
  return (
    <div style={{ marginBottom: '8px' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.03)',
          border: 'none',
          borderRadius: '8px',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
        }}
      >
        <span>{title}</span>
        <span
          style={{
            transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform 0.3s ease',
            fontSize: '12px',
          }}
        >
          ▼
        </span>
      </button>
      <div
        style={{
          maxHeight: collapsed ? 0 : '1000px',
          overflow: 'hidden',
          transition: 'max-height 0.4s ease',
          padding: collapsed ? '0 16px' : '16px',
        }}
      >
        {children}
      </div>
    </div>
  );
};

interface PresetButtonProps {
  mode: PresetMode;
  icon: string;
  name: string;
  isActive: boolean;
  onClick: () => void;
}

const PresetButton: React.FC<PresetButtonProps> = ({ mode, icon, name, isActive, onClick }) => {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <button
      onClick={() => {
        setIsPressed(true);
        onClick();
        setTimeout(() => setIsPressed(false), 200);
      }}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 8px',
        background: isActive ? '#FF6B35' : '#333333',
        border: 'none',
        borderRadius: '10px',
        color: '#ffffff',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: isPressed ? 'scale(0.95)' : 'scale(1)',
        boxShadow: isActive ? '0 4px 20px rgba(255,107,53,0.4)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!isPressed) {
          e.currentTarget.style.transform = 'scale(1.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isPressed) {
          e.currentTarget.style.transform = 'scale(1)';
        }
      }}
    >
      <span style={{ fontSize: '24px', marginBottom: '4px' }}>{icon}</span>
      <span style={{ fontSize: '12px', fontWeight: 500 }}>{name}</span>
    </button>
  );
};

export const ControlPanel: React.FC = () => {
  const {
    emitterConfig,
    uiState,
    setEmitterConfig,
    applyPreset,
    setPanelPosition,
    toggleSection,
  } = useParticleStore();

  const panelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.panel-header')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - uiState.panelPosition.x,
        y: e.clientY - uiState.panelPosition.y,
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !panelRef.current) return;

      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const panelWidth = panelRef.current.offsetWidth;
      const panelHeight = panelRef.current.offsetHeight;

      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;

      newX = Math.max(0, Math.min(newX, screenWidth - panelWidth));
      newY = Math.max(0, Math.min(newY, screenHeight - panelHeight));

      setPanelPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, setPanelPosition]);

  const presets: { mode: PresetMode; icon: string; name: string }[] = [
    { mode: 'fire', icon: '🔥', name: '火焰' },
    { mode: 'smoke', icon: '💨', name: '烟雾' },
    { mode: 'dust', icon: '💥', name: '粉尘' },
  ];

  const sizeCurves: { value: SizeCurve; label: string }[] = [
    { value: 'linear', label: SIZE_CURVE_LABELS.linear },
    { value: 'growShrink', label: SIZE_CURVE_LABELS.growShrink },
    { value: 'shrinkGrow', label: SIZE_CURVE_LABELS.shrinkGrow },
  ];

  return (
    <div
      ref={panelRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        left: uiState.panelPosition.x,
        top: uiState.panelPosition.y,
        width: '320px',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
        background: 'rgba(20, 20, 40, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
        color: '#ffffff',
        fontFamily: "'Segoe UI', -apple-system, sans-serif",
        userSelect: 'none',
        zIndex: 100,
        transition: 'box-shadow 0.3s ease',
      }}
    >
      <div
        className="panel-header"
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          cursor: 'move',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 600,
            background: 'linear-gradient(90deg, #FF6B35, #FFD700)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          粒子系统控制器
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#888888' }}>
          点击场景创建发射器 · 拖拽旋转视角
        </p>
      </div>

      <div style={{ padding: '16px' }}>
        <CollapsibleSection
          title="粒子参数"
          collapsed={uiState.collapsedSections.particleParams}
          onToggle={() => toggleSection('particleParams')}
        >
          <Slider
            label="发射速率"
            value={emitterConfig.emissionRate}
            min={10}
            max={200}
            step={1}
            onChange={(v) => setEmitterConfig({ emissionRate: v })}
            unit=" 个/秒"
          />
          <Slider
            label="初始速度"
            value={emitterConfig.initialSpeed}
            min={0.5}
            max={5}
            step={0.1}
            onChange={(v) => setEmitterConfig({ initialSpeed: v })}
            unit=" 单位/秒"
          />
          <Slider
            label="生命周期"
            value={emitterConfig.lifetime}
            min={1}
            max={8}
            step={0.5}
            onChange={(v) => setEmitterConfig({ lifetime: v })}
            unit=" 秒"
          />
          <Slider
            label="拖尾长度"
            value={emitterConfig.trailLength}
            min={0}
            max={10}
            step={1}
            onChange={(v) => setEmitterConfig({ trailLength: v })}
            unit=" 帧"
          />
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                color: '#cccccc',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '8px',
              }}
            >
              大小变化曲线
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {sizeCurves.map((curve) => (
                <button
                  key={curve.value}
                  onClick={() => setEmitterConfig({ sizeCurve: curve.value })}
                  style={{
                    flex: 1,
                    padding: '8px 6px',
                    background: emitterConfig.sizeCurve === curve.value ? '#2196F3' : '#333333',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '11px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {curve.label}
                </button>
              ))}
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="颜色设置"
          collapsed={uiState.collapsedSections.colorSettings}
          onToggle={() => toggleSection('colorSettings')}
        >
          <div style={{ display: 'flex', gap: '32px' }}>
            <ColorPicker
              label="起始颜色"
              value={emitterConfig.startColor}
              onChange={(c) => setEmitterConfig({ startColor: c })}
            />
            <ColorPicker
              label="结束颜色"
              value={emitterConfig.endColor}
              onChange={(c) => setEmitterConfig({ endColor: c })}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="预设模式"
          collapsed={uiState.collapsedSections.presets}
          onToggle={() => toggleSection('presets')}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            {presets.map((preset) => (
              <PresetButton
                key={preset.mode}
                mode={preset.mode}
                icon={preset.icon}
                name={preset.name}
                isActive={uiState.currentMode === preset.mode}
                onClick={() => applyPreset(preset.mode)}
              />
            ))}
          </div>
        </CollapsibleSection>

        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            fontSize: '11px',
            color: '#888888',
            textAlign: 'center',
          }}
        >
          💡 提示：点击场景中的任意位置可移动粒子发射器
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        
        ::-webkit-scrollbar {
          width: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.3);
        }
      `}</style>
    </div>
  );
};
