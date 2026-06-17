import { useState, useCallback, useEffect } from 'react';
import { LayoutComponent, ColorFormat, LayoutComponentStyle } from '../types';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  onChangeEnd: () => void;
}

function ColorPicker({ color, onChange, onChangeEnd }: ColorPickerProps) {
  const [format, setFormat] = useState<ColorFormat>('hex');
  const [hexValue, setHexValue] = useState(color);
  const [rgbValue, setRgbValue] = useState({ r: 0, g: 0, b: 0 });
  const [hslValue, setHslValue] = useState({ h: 0, s: 0, l: 0 });

  useEffect(() => {
    setHexValue(color);
    const rgb = hexToRgb(color);
    if (rgb) {
      setRgbValue(rgb);
      setHslValue(rgbToHsl(rgb.r, rgb.g, rgb.b));
    }
  }, [color]);

  const handleHexChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;
      if (!value.startsWith('#')) {
        value = '#' + value;
      }
      setHexValue(value);

      if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
        onChange(value);
        const rgb = hexToRgb(value);
        if (rgb) {
          setRgbValue(rgb);
          setHslValue(rgbToHsl(rgb.r, rgb.g, rgb.b));
        }
      }
    },
    [onChange]
  );

  const handleRgbChange = useCallback(
    (channel: 'r' | 'g' | 'b', value: number) => {
      const newRgb = { ...rgbValue, [channel]: Math.max(0, Math.min(255, value)) };
      setRgbValue(newRgb);
      const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
      setHexValue(hex);
      setHslValue(rgbToHsl(newRgb.r, newRgb.g, newRgb.b));
      onChange(hex);
    },
    [rgbValue, onChange]
  );

  const handleHslChange = useCallback(
    (channel: 'h' | 's' | 'l', value: number) => {
      const newHsl = { ...hslValue, [channel]: value };
      setHslValue(newHsl);
      const rgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
      setRgbValue(rgb);
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      setHexValue(hex);
      onChange(hex);
    },
    [hslValue, onChange]
  );

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <label style={{ fontSize: '13px', fontWeight: 500, color: '#2d3748' }}>背景颜色</label>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          {(['hex', 'rgb', 'hsl'] as ColorFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              style={{
                padding: '2px 8px',
                fontSize: '11px',
                border: format === f ? '1px solid #4299e1' : '1px solid #e2e8f0',
                borderRadius: '4px',
                background: format === f ? '#ebf8ff' : '#ffffff',
                color: format === f ? '#2b6cb0' : '#718096',
                cursor: 'pointer',
                textTransform: 'uppercase',
                fontWeight: 500,
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            backgroundColor: hexValue,
            borderRadius: '8px',
            border: '2px solid #e2e8f0',
            flexShrink: 0,
          }}
        />
        <input
          type="color"
          value={hexValue}
          onChange={(e) => {
            setHexValue(e.target.value);
            onChange(e.target.value);
            const rgb = hexToRgb(e.target.value);
            if (rgb) {
              setRgbValue(rgb);
              setHslValue(rgbToHsl(rgb.r, rgb.g, rgb.b));
            }
          }}
          onBlur={onChangeEnd}
          style={{
            width: '40px',
            height: '40px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        />
      </div>

      {format === 'hex' && (
        <input
          type="text"
          value={hexValue}
          onChange={handleHexChange}
          onBlur={onChangeEnd}
          placeholder="#000000"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '13px',
            fontFamily: 'monospace',
          }}
        />
      )}

      {format === 'rgb' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {(['r', 'g', 'b'] as const).map((channel) => (
            <div key={channel}>
              <label style={{ fontSize: '11px', color: '#718096', textTransform: 'uppercase' }}>
                {channel}
              </label>
              <input
                type="number"
                min="0"
                max="255"
                value={rgbValue[channel]}
                onChange={(e) => handleRgbChange(channel, parseInt(e.target.value) || 0)}
                onBlur={onChangeEnd}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '13px',
                }}
              />
            </div>
          ))}
        </div>
      )}

      {format === 'hsl' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(['h', 's', 'l'] as const).map((channel) => (
            <div key={channel} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label
                style={{
                  width: '20px',
                  fontSize: '11px',
                  color: '#718096',
                  textTransform: 'uppercase',
                }}
              >
                {channel}
              </label>
              <input
                type="range"
                min={channel === 'h' ? 0 : 0}
                max={channel === 'h' ? 360 : 100}
                value={hslValue[channel]}
                onChange={(e) => handleHslChange(channel, parseInt(e.target.value))}
                onMouseUp={onChangeEnd}
                onTouchEnd={onChangeEnd}
                style={{ flex: 1 }}
              />
              <span style={{ width: '40px', fontSize: '12px', color: '#4a5568', textAlign: 'right' }}>
                {hslValue[channel]}
                {channel !== 'h' ? '%' : '°'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface MarginInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onChangeEnd: () => void;
}

function MarginInput({ label, value, onChange, onChangeEnd }: MarginInputProps) {
  return (
    <div>
      <label style={{ fontSize: '11px', color: '#718096', display: 'block', marginBottom: '4px' }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          onBlur={onChangeEnd}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px 0 0 6px',
            fontSize: '13px',
          }}
        />
        <span
          style={{
            padding: '6px 10px',
            background: '#f7fafc',
            border: '1px solid #e2e8f0',
            borderLeft: 'none',
            borderRadius: '0 6px 6px 0',
            fontSize: '12px',
            color: '#718096',
          }}
        >
          px
        </span>
      </div>
    </div>
  );
}

interface PropertyPanelProps {
  component: LayoutComponent | undefined;
  onStyleChange: (id: string, style: Partial<LayoutComponentStyle>) => void;
  onStyleChangeEnd: () => void;
}

function PropertyPanel({ component, onStyleChange, onStyleChangeEnd }: PropertyPanelProps) {
  const handleStyleChange = useCallback(
    (style: Partial<LayoutComponentStyle>) => {
      if (component) {
        onStyleChange(component.id, style);
      }
    },
    [component, onStyleChange]
  );

  const handleMarginChange = useCallback(
    (direction: 'top' | 'right' | 'bottom' | 'left', value: number) => {
      if (component) {
        onStyleChange(component.id, {
          margin: {
            ...component.style.margin,
            [direction]: value,
          },
        });
      }
    },
    [component, onStyleChange]
  );

  if (!component) {
    return (
      <div
        style={{
          width: '280px',
          background: '#ffffff',
          padding: '20px',
          borderLeft: '1px solid #e2e8f0',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#a0aec0',
          fontSize: '13px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎨</div>
          <div>选择一个组件</div>
          <div>以编辑属性</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '280px',
        background: '#ffffff',
        padding: '20px',
        borderLeft: '1px solid #e2e8f0',
        boxShadow: '-4px 0 6px -1px rgba(0, 0, 0, 0.05)',
        flexShrink: 0,
        overflowY: 'auto',
      }}
    >
      <div style={{ marginBottom: '20px' }}>
        <h3
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: '#2d3748',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {component.type === 'navbar' && '🧭'}
          {component.type === 'carousel' && '🖼️'}
          {component.type === 'card_grid' && '📋'}
          {component.type === 'two_column' && '⊞'}
          {component.type === 'three_column' && '⬚'}
          {component.type === 'footer' && '📄'}
          {component.name}
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#718096' }}>
          ID: {component.id.slice(0, 8)}...
        </p>
      </div>

      <div style={{ height: '1px', background: '#e2e8f0', marginBottom: '20px' }} />

      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '13px', fontWeight: 500, color: '#2d3748', display: 'block', marginBottom: '12px' }}>
          尺寸
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#718096', display: 'block', marginBottom: '4px' }}>
              宽度
            </label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  padding: '6px 10px',
                  background: '#f7fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px 0 0 6px',
                  fontSize: '12px',
                  color: '#718096',
                }}
              >
                W
              </span>
              <input
                type="text"
                value={`${Math.round(component.width)}px`}
                disabled
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #e2e8f0',
                  borderLeft: 'none',
                  borderRadius: '0 6px 6px 0',
                  fontSize: '13px',
                  background: '#f7fafc',
                  color: '#a0aec0',
                }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#718096', display: 'block', marginBottom: '4px' }}>
              高度
            </label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  padding: '6px 10px',
                  background: '#f7fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px 0 0 6px',
                  fontSize: '12px',
                  color: '#718096',
                }}
              >
                H
              </span>
              <input
                type="text"
                value={`${Math.round(component.height)}px`}
                disabled
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #e2e8f0',
                  borderLeft: 'none',
                  borderRadius: '0 6px 6px 0',
                  fontSize: '13px',
                  background: '#f7fafc',
                  color: '#a0aec0',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <ColorPicker
        color={component.style.backgroundColor}
        onChange={(color) => handleStyleChange({ backgroundColor: color })}
        onChangeEnd={onStyleChangeEnd}
      />

      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '13px', fontWeight: 500, color: '#2d3748', display: 'block', marginBottom: '12px' }}>
          边距
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <MarginInput
            label="上"
            value={component.style.margin.top}
            onChange={(v) => handleMarginChange('top', v)}
            onChangeEnd={onStyleChangeEnd}
          />
          <MarginInput
            label="右"
            value={component.style.margin.right}
            onChange={(v) => handleMarginChange('right', v)}
            onChangeEnd={onStyleChangeEnd}
          />
          <MarginInput
            label="下"
            value={component.style.margin.bottom}
            onChange={(v) => handleMarginChange('bottom', v)}
            onChangeEnd={onStyleChangeEnd}
          />
          <MarginInput
            label="左"
            value={component.style.margin.left}
            onChange={(v) => handleMarginChange('left', v)}
            onChangeEnd={onStyleChangeEnd}
          />
        </div>
      </div>

      <div>
        <label
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#2d3748',
            display: 'block',
            marginBottom: '12px',
          }}
        >
          圆角
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="range"
            min="0"
            max="50"
            value={component.style.borderRadius}
            onChange={(e) => handleStyleChange({ borderRadius: parseInt(e.target.value) })}
            onMouseUp={onStyleChangeEnd}
            onTouchEnd={onStyleChangeEnd}
            style={{ flex: 1 }}
          />
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="number"
              min="0"
              max="50"
              value={component.style.borderRadius}
              onChange={(e) => handleStyleChange({ borderRadius: parseInt(e.target.value) || 0 })}
              onBlur={onStyleChangeEnd}
              style={{
                width: '60px',
                padding: '6px 8px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px 0 0 6px',
                fontSize: '13px',
                textAlign: 'center',
              }}
            />
            <span
              style={{
                padding: '6px 10px',
                background: '#f7fafc',
                border: '1px solid #e2e8f0',
                borderLeft: 'none',
                borderRadius: '0 6px 6px 0',
                fontSize: '12px',
                color: '#718096',
              }}
            >
              px
            </span>
          </div>
        </div>
        <div
          style={{
            marginTop: '12px',
            height: '40px',
            background: component.style.backgroundColor,
            borderRadius: `${component.style.borderRadius}px`,
            border: '1px solid #e2e8f0',
            transition: 'border-radius 0.2s',
          }}
        />
      </div>

      <div style={{ height: '1px', background: '#e2e8f0', marginTop: '24px', marginBottom: '16px' }} />

      <div style={{ fontSize: '11px', color: '#a0aec0', lineHeight: '1.6' }}>
        <div style={{ fontWeight: 500, color: '#718096', marginBottom: '8px' }}>快捷键</div>
        <div>• 右键: 操作菜单</div>
        <div>• Delete: 删除组件</div>
        <div>• Ctrl+Z: 撤销</div>
        <div>• Ctrl+Y: 重做</div>
      </div>
    </div>
  );
}

export default PropertyPanel;
