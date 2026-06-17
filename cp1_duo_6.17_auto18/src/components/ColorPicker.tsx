import React, { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { hexToRgb, rgbToHex } from '../utils/gradientUtils';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  onClose?: () => void;
}

type ColorMode = 'hex' | 'rgb' | 'hsl';

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, onClose }) => {
  const [mode, setMode] = useState<ColorMode>('hex');
  const [rgb, setRgb] = useState(hexToRgb(color) || { r: 255, g: 0, b: 0 });
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newRgb = hexToRgb(color);
    if (newRgb) {
      setRgb(newRgb);
    }
  }, [color]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleRgbChange = (channel: 'r' | 'g' | 'b', value: number) => {
    const newRgb = { ...rgb, [channel]: Math.min(255, Math.max(0, value)) };
    setRgb(newRgb);
    onChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };

  const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (!value.startsWith('#')) {
      value = '#' + value;
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      onChange(value);
    }
  };

  return (
    <div
      ref={pickerRef}
      style={{
        position: 'absolute',
        zIndex: 1000,
        background: '#fff',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        width: '240px',
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <HexColorPicker color={color} onChange={onChange} style={{ width: '100%' }} />
      </div>

      <div
        style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '12px',
          borderBottom: '1px solid #e8e8e8',
        }}
      >
        {(['hex', 'rgb', 'hsl'] as ColorMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '6px 12px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '12px',
              color: mode === m ? '#1890ff' : '#666',
              borderBottom: mode === m ? '2px solid #1890ff' : '2px solid transparent',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === 'hex' && (
        <div>
          <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>
            十六进制
          </label>
          <input
            type="text"
            value={color}
            onChange={handleHexInput}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              fontSize: '13px',
              fontFamily: 'monospace',
              outline: 'none',
              transition: 'border-color 0.3s ease',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#1890ff')}
            onBlur={(e) => (e.target.style.borderColor = '#d9d9d9')}
          />
        </div>
      )}

      {mode === 'rgb' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(['r', 'g', 'b'] as const).map((channel) => (
            <div key={channel} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '16px',
                  fontSize: '12px',
                  color: '#888',
                  textTransform: 'uppercase',
                }}
              >
                {channel}
              </span>
              <input
                type="range"
                min="0"
                max="255"
                value={rgb[channel]}
                onChange={(e) => handleRgbChange(channel, parseInt(e.target.value))}
                style={{ flex: 1, cursor: 'pointer' }}
              />
              <input
                type="number"
                min="0"
                max="255"
                value={rgb[channel]}
                onChange={(e) => handleRgbChange(channel, parseInt(e.target.value) || 0)}
                style={{
                  width: '50px',
                  padding: '4px 6px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  fontSize: '12px',
                  textAlign: 'center',
                }}
              />
            </div>
          ))}
        </div>
      )}

      {mode === 'hsl' && (
        <div style={{ padding: '16px 0', textAlign: 'center', color: '#999', fontSize: '12px' }}>
          HSL 模式通过上方色盘和色相条调节
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
