import React, { useState, useRef, useEffect } from 'react';
import { usePixel } from '../store/pixelStore';

const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
  '#FF00FF', '#00FFFF', '#FF6600', '#6600FF', '#00FF66', '#FF6699',
  '#9966FF', '#66FFFF', '#FFCC00', '#FF9999', '#99FF99', '#9999FF',
  '#CCCCCC', '#999999', '#666666', '#333333', '#663300', '#336600',
];

const ColorPicker: React.FC = () => {
  const { state, dispatch } = usePixel();
  const { currentColor } = state;
  const [showCustom, setShowCustom] = useState(false);
  const [customColor, setCustomColor] = useState(currentColor);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowCustom(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleColorSelect = (color: string) => {
    dispatch({ type: 'SET_CURRENT_COLOR', color });
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
  };

  const applyCustomColor = () => {
    dispatch({ type: 'SET_CURRENT_COLOR', color: customColor });
    setShowCustom(false);
  };

  const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  };

  const hslToHex = (h: number, s: number, l: number): string => {
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
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const handleSaturationChange = (value: number) => {
    setSaturation(value);
    const hsl = hexToHsl(customColor);
    setCustomColor(hslToHex(hsl.h, value, hsl.l));
  };

  const handleLightnessChange = (value: number) => {
    setLightness(value);
    const hsl = hexToHsl(customColor);
    setCustomColor(hslToHex(hsl.h, hsl.s, value));
  };

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid #333',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '16px',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: currentColor,
            border: '2px solid #555',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          }}
        />
        <span style={{ fontSize: '13px', color: '#aaa' }}>当前颜色</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '6px',
          marginBottom: '12px',
        }}
      >
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => handleColorSelect(color)}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: color,
              border: currentColor === color ? '2px solid #fff' : '2px solid #333',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: currentColor === color ? '0 0 10px rgba(255, 255, 255, 0.5)' : 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          />
        ))}
      </div>

      <button
        onClick={() => {
          setCustomColor(currentColor);
          const hsl = hexToHsl(currentColor);
          setSaturation(Math.round(hsl.s));
          setLightness(Math.round(hsl.l));
          setShowCustom(!showCustom);
        }}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '8px',
          background: '#444',
          color: '#fff',
          fontSize: '13px',
          transition: 'background 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#666';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#444';
        }}
      >
        自定义颜色
      </button>

      {showCustom && (
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '10px',
            background: '#2a2a3e',
            border: '1px solid #444',
            borderRadius: '12px',
            padding: '16px',
            zIndex: 100,
            width: '220px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '8px' }}>
              颜色选择
            </label>
            <input
              type="color"
              value={customColor}
              onChange={(e) => handleCustomColorChange(e.target.value)}
              style={{
                width: '100%',
                height: '40px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                background: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '8px' }}>
              饱和度: {saturation}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={saturation}
              onChange={(e) => handleSaturationChange(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '8px' }}>
              亮度: {lightness}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={lightness}
              onChange={(e) => handleLightnessChange(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              gap: '8px',
            }}
          >
            <button
              onClick={() => setShowCustom(false)}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                background: '#444',
                color: '#fff',
                fontSize: '12px',
                transition: 'background 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#666';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#444';
              }}
            >
              取消
            </button>
            <button
              onClick={applyCustomColor}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                background: '#5865F2',
                color: '#fff',
                fontSize: '12px',
                transition: 'background 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#7983F5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#5865F2';
              }}
            >
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
