import React, { useMemo } from 'react';
import { ColorItem } from './types';

interface ColorEditorProps {
  color: ColorItem;
  onChange: (id: string, value: string) => void;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
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
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function generateRecommendedColors(hex: string): string[] {
  const { h, s, l } = hexToHsl(hex);
  const colors: string[] = [];
  colors.push(hslToHex((h + 30) % 360, s, l));
  colors.push(hslToHex((h + 330) % 360, s, l));
  colors.push(hslToHex((h + 180) % 360, s, l));
  colors.push(hslToHex(h, s, Math.min(l + 20, 95)));
  colors.push(hslToHex(h, s, Math.max(l - 20, 5)));
  colors.push(hslToHex(h, Math.max(s - 30, 10), l));
  return colors;
}

function generateHueGradient(s: number, l: number): string {
  const stops: string[] = [];
  for (let i = 0; i <= 360; i += 30) {
    stops.push(`${hslToHex(i, s, l)} ${(i / 360) * 100}%`);
  }
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

const ColorEditor: React.FC<ColorEditorProps> = ({ color, onChange }) => {
  const hsl = useMemo(() => hexToHsl(color.value), [color.value]);
  const recommendedColors = useMemo(() => generateRecommendedColors(color.value), [color.value]);
  const hueGradient = useMemo(() => generateHueGradient(hsl.s, hsl.l), [hsl.s, hsl.l]);

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newH = parseInt(e.target.value, 10);
    const newHex = hslToHex(newH, hsl.s, hsl.l);
    onChange(color.id, newHex);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      onChange(color.id, val);
    }
  };

  const handleRecommendClick = (hex: string) => {
    onChange(color.id, hex);
  };

  const sliderStyle: React.CSSProperties = {
    '--slider-gradient': hueGradient,
    '--current-color': color.value,
  } as React.CSSProperties;

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      transition: 'all 0.4s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>{color.label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: color.value,
            border: '2px solid #eee',
            transition: 'background-color 0.4s ease',
          }} />
          <input
            type="text"
            value={color.value}
            onChange={handleInputChange}
            style={{
              width: '80px',
              padding: '4px 8px',
              fontSize: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <input
          type="range"
          min="0"
          max="360"
          value={hsl.h}
          onChange={handleHueChange}
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '4px',
            background: `var(--slider-gradient, ${hueGradient})`,
            appearance: 'none',
            WebkitAppearance: 'none',
            cursor: 'pointer',
            ...sliderStyle,
          }}
        />
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: var(--current-color, #1976D2);
            border: 2px solid #fff;
            box-shadow: 0 1px 4px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: background-color 0.4s ease;
          }
          input[type="range"]::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: var(--current-color, #1976D2);
            border: 2px solid #fff;
            box-shadow: 0 1px 4px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: background-color 0.4s ease;
          }
        `}</style>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        {recommendedColors.map((recColor, idx) => (
          <button
            key={idx}
            onClick={() => handleRecommendClick(recColor)}
            title={recColor}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: recColor,
              border: '2px solid #fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              padding: 0,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'scale(1.15)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ColorEditor;
