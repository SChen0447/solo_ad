import React, { useState } from 'react';
import { FilterParams, TextStyle, FONT_FAMILIES, DEFAULT_FILTERS, DEFAULT_TEXT_STYLE } from './types';

interface FilterControlProps {
  filters: FilterParams;
  onFiltersChange: (filters: FilterParams) => void;
  textStyle: TextStyle;
  onTextStyleChange: (style: TextStyle) => void;
  selectedLayerType: 'image' | 'text' | null;
  isMobileCollapsed?: boolean;
  onToggleMobile?: () => void;
}

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, unit = '', onChange }) => {
  const percent = ((value - min) / (max - min)) * 100;
  const ratio = max === 360 ? value / 360 : (value - (max + min) / 2) / ((max - min) / 2);
  const thumbColor =
    max === 360
      ? `hsl(${value}, 70%, 55%)`
      : ratio < 0
      ? `hsl(${210 + ratio * 50}, 70%, ${55 + Math.abs(ratio) * 20}%)`
      : `hsl(${30 - ratio * 30}, 80%, ${50 + ratio * 15}%)`;

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 13, color: '#E0E0E0', fontWeight: 500 }}>{label}</span>
        <span
          style={{
            fontSize: 12,
            color: '#3B82F6',
            fontFamily: 'monospace',
            background: 'rgba(59, 130, 246, 0.1)',
            padding: '2px 8px',
            borderRadius: 4,
          }}
        >
          {value}
          {unit}
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          height: 20,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 4,
            borderRadius: 2,
            background: '#1A1A2E',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: `${percent}%`,
            height: 4,
            borderRadius: 2,
            background: '#3B82F6',
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
            width: '100%',
            opacity: 0,
            cursor: 'pointer',
            height: 20,
            zIndex: 2,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `calc(${percent}% - 8px)`,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: thumbColor,
            border: '2px solid white',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
            transition: 'background 0.2s',
          }}
        />
      </div>
    </div>
  );
};

const COLOR_SWATCHES = [
  '#1A1A2E', '#FFFFFF', '#E0E0E0', '#3B82F6', '#EF4444',
  '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4',
  '#F97316', '#84CC16', '#14B8A6', '#6366F1', '#F43F5E',
];

const FilterControl: React.FC<FilterControlProps> = ({
  filters,
  onFiltersChange,
  textStyle,
  onTextStyleChange,
  selectedLayerType,
  isMobileCollapsed = false,
  onToggleMobile,
}) => {
  const [colorPickerOpen, setColorPickerOpen] = useState<'color' | 'bg' | null>(null);
  const [hexInput, setHexInput] = useState(textStyle.color);
  const [bgHexInput, setBgHexInput] = useState(textStyle.backgroundColor);

  const updateFilter = (key: keyof FilterParams, value: number) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetFilters = () => onFiltersChange({ ...DEFAULT_FILTERS });

  const updateTextStyle = (key: keyof TextStyle, value: any) => {
    onTextStyleChange({ ...textStyle, [key]: value });
  };

  return (
    <>
      {window.innerWidth < 768 && (
        <button
          onClick={onToggleMobile}
          style={{
            position: 'fixed',
            right: isMobileCollapsed ? 0 : 280,
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#2D2D44',
            color: '#E0E0E0',
            border: 'none',
            padding: '12px 8px',
            borderRadius: '8px 0 0 8px',
            cursor: 'pointer',
            zIndex: 999,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
        >
          {isMobileCollapsed ? '☰' : '✕'}
        </button>
      )}
      <div
        style={{
          position: window.innerWidth < 768 ? 'fixed' : 'relative',
          right: 0,
          top: window.innerWidth < 768 ? 0 : undefined,
          height: window.innerWidth < 768 ? '100vh' : '100%',
          width: 280,
          minWidth: 280,
          background: '#2D2D44',
          borderTopLeftRadius: 12,
          borderBottomLeftRadius: 12,
          padding: 20,
          overflowY: 'auto',
          overflowX: 'hidden',
          zIndex: window.innerWidth < 768 ? 998 : 1,
          transform: window.innerWidth < 768 && isMobileCollapsed ? 'translateX(100%)' : 'translateX(0)',
          transition: window.innerWidth < 768 ? 'transform 0.3s ease' : undefined,
          boxShadow: window.innerWidth < 768 ? '-4px 0 20px rgba(0,0,0,0.5)' : undefined,
        }}
      >
        {!selectedLayerType && (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: '#888', fontSize: 13 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎨</div>
            选择画布上的图层以编辑属性
          </div>
        )}

        {selectedLayerType === 'image' && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}
            >
              <h3
                style={{
                  fontSize: 16,
                  color: '#E0E0E0',
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                ✨ 滤镜效果
              </h3>
              <button
                onClick={resetFilters}
                style={{
                  fontSize: 11,
                  color: '#888',
                  background: 'transparent',
                  border: '1px solid #444',
                  padding: '4px 8px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3B82F6';
                  e.currentTarget.style.color = '#3B82F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#444';
                  e.currentTarget.style.color = '#888';
                }}
              >
                重置
              </button>
            </div>
            <Slider
              label="亮度"
              value={filters.brightness}
              min={-100}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => updateFilter('brightness', v)}
            />
            <Slider
              label="对比度"
              value={filters.contrast}
              min={-100}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => updateFilter('contrast', v)}
            />
            <Slider
              label="饱和度"
              value={filters.saturation}
              min={-100}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => updateFilter('saturation', v)}
            />
            <Slider
              label="色相旋转"
              value={filters.hueRotate}
              min={0}
              max={360}
              step={1}
              unit="°"
              onChange={(v) => updateFilter('hueRotate', v)}
            />
          </>
        )}

        {selectedLayerType === 'text' && (
          <>
            <h3
              style={{
                fontSize: 16,
                color: '#E0E0E0',
                fontWeight: 600,
                marginBottom: 20,
              }}
            >
              📝 文字样式
            </h3>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#AAA', marginBottom: 6, display: 'block' }}>
                字体
              </label>
              <select
                value={textStyle.fontFamily}
                onChange={(e) => updateTextStyle('fontFamily', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: '#1A1A2E',
                  color: '#E0E0E0',
                  border: '1px solid #444',
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: 'pointer',
                  outline: 'none',
                  fontFamily: textStyle.fontFamily,
                }}
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f} value={f} style={{ fontFamily: f }}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#AAA', marginBottom: 6, display: 'block' }}>
                字号 ({textStyle.fontSize}px)
              </label>
              <input
                type="range"
                min={12}
                max={120}
                value={textStyle.fontSize}
                onChange={(e) => updateTextStyle('fontSize', parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#AAA', marginBottom: 6, display: 'block' }}>
                文字颜色
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div
                  onClick={() => {
                    setColorPickerOpen(colorPickerOpen === 'color' ? null : 'color');
                    setHexInput(textStyle.color);
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: textStyle.color,
                    border: '2px solid #444',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                />
                <input
                  type="text"
                  value={textStyle.color}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
                      updateTextStyle('color', v);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    background: '#1A1A2E',
                    color: '#E0E0E0',
                    border: '1px solid #444',
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
              </div>
              {colorPickerOpen === 'color' && (
                <div
                  style={{
                    marginTop: 8,
                    padding: 8,
                    background: '#1A1A2E',
                    borderRadius: 6,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: 6,
                  }}
                >
                  {COLOR_SWATCHES.map((c) => (
                    <div
                      key={c}
                      onClick={() => {
                        updateTextStyle('color', c);
                        setColorPickerOpen(null);
                      }}
                      style={{
                        width: '100%',
                        aspectRatio: 1,
                        borderRadius: 4,
                        background: c,
                        cursor: 'pointer',
                        border: textStyle.color === c ? '2px solid #3B82F6' : '2px solid transparent',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    />
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#AAA', marginBottom: 6, display: 'block' }}>
                样式
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { key: 'fontWeight', label: 'B', active: textStyle.fontWeight === 'bold', off: 'normal', on: 'bold', style: { fontWeight: 900 } },
                  { key: 'fontStyle', label: 'I', active: textStyle.fontStyle === 'italic', off: 'normal', on: 'italic', style: { fontStyle: 'italic' } },
                  { key: 'textDecoration', label: 'U', active: textStyle.textDecoration === 'underline', off: 'none', on: 'underline', style: { textDecoration: 'underline' } },
                ].map((btn) => (
                  <button
                    key={btn.key}
                    onClick={() =>
                      updateTextStyle(btn.key as keyof TextStyle, btn.active ? btn.off : btn.on)
                    }
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: btn.active ? '#3B82F6' : '#1A1A2E',
                      color: btn.active ? 'white' : '#E0E0E0',
                      border: '1px solid ' + (btn.active ? '#3B82F6' : '#444'),
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 14,
                      ...btn.style,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#AAA', marginBottom: 6, display: 'block' }}>
                背景色
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div
                  onClick={() => {
                    setColorPickerOpen(colorPickerOpen === 'bg' ? null : 'bg');
                    setBgHexInput(textStyle.backgroundColor);
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background:
                      textStyle.backgroundColor === 'transparent'
                        ? 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 10px 10px'
                        : textStyle.backgroundColor,
                    border: '2px solid #444',
                    cursor: 'pointer',
                  }}
                />
                <button
                  onClick={() => updateTextStyle('backgroundColor', 'transparent')}
                  style={{
                    padding: '6px 10px',
                    background: textStyle.backgroundColor === 'transparent' ? '#3B82F6' : '#1A1A2E',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 11,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
                >
                  无背景
                </button>
              </div>
              {colorPickerOpen === 'bg' && (
                <div
                  style={{
                    marginTop: 8,
                    padding: 8,
                    background: '#1A1A2E',
                    borderRadius: 6,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: 6,
                  }}
                >
                  {COLOR_SWATCHES.map((c) => (
                    <div
                      key={c}
                      onClick={() => {
                        updateTextStyle('backgroundColor', c);
                        setColorPickerOpen(null);
                      }}
                      style={{
                        width: '100%',
                        aspectRatio: 1,
                        borderRadius: 4,
                        background: c,
                        cursor: 'pointer',
                        border:
                          textStyle.backgroundColor === c ? '2px solid #3B82F6' : '2px solid transparent',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#AAA', marginBottom: 6, display: 'block' }}>
                背景透明度 ({Math.round(textStyle.backgroundOpacity * 100)}%)
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={textStyle.backgroundOpacity}
                onChange={(e) => updateTextStyle('backgroundOpacity', parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default FilterControl;
