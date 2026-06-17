import React, { useMemo, useCallback } from 'react';
import { ColorItem } from './types';

interface ColorEditorProps {
  color: ColorItem;
  onChange: (id: string, value: string) => void;
  onToggleLock: (id: string) => void;
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

const LockIcon: React.FC<{ locked: boolean }> = ({ locked }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke={locked ? '#FFD700' : '#999'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transition: 'stroke 0.3s ease' }}
  >
    {locked ? (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    ) : (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
      </>
    )}
  </svg>
);

const ColorEditor: React.FC<ColorEditorProps> = ({ color, onChange, onToggleLock }) => {
  const hsl = useMemo(() => hexToHsl(color.value), [color.value]);
  const recommendedColors = useMemo(() => generateRecommendedColors(color.value), [color.value]);
  const hueGradient = useMemo(() => generateHueGradient(hsl.s, hsl.l), [hsl.s, hsl.l]);

  const handleHueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (color.locked) return;
    const newH = parseInt(e.target.value, 10);
    const newHex = hslToHex(newH, hsl.s, hsl.l);
    onChange(color.id, newHex);
  }, [color.id, color.locked, hsl.s, hsl.l, onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (color.locked) return;
    let val = e.target.value;
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      onChange(color.id, val);
    }
  }, [color.id, color.locked, onChange]);

  const handleRecommendClick = useCallback((hex: string) => {
    if (color.locked) return;
    onChange(color.id, hex);
  }, [color.id, color.locked, onChange]);

  const handleLockClick = useCallback(() => {
    onToggleLock(color.id);
  }, [color.id, onToggleLock]);

  const sliderStyle: React.CSSProperties = {
    '--slider-gradient': hueGradient,
    '--current-color': color.value,
  } as React.CSSProperties;

  return (
    <div style={{
      backgroundColor: color.locked ? '#FFFBF0' : '#ffffff',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      boxShadow: color.locked ? '0 1px 3px rgba(255, 215, 0, 0.2)' : '0 1px 3px rgba(0,0,0,0.08)',
      border: color.locked ? '1px solid #FFD700' : '1px solid transparent',
      transition: 'all 0.4s ease',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 600, fontSize: '14px', color: color.locked ? '#B8860B' : '#333', transition: 'color 0.3s ease' }}>
            {color.label}
          </span>
          <button
            onClick={handleLockClick}
            title={color.locked ? '点击解锁' : '点击锁定'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = color.locked ? '#FFF4CC' : '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            <LockIcon locked={color.locked} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: color.value,
            border: color.locked ? '2px solid #FFD700' : '2px solid #eee',
            transition: 'all 0.4s ease',
          }} />
          <input
            type="text"
            value={color.value}
            onChange={handleInputChange}
            readOnly={color.locked}
            style={{
              width: '80px',
              padding: '4px 8px',
              fontSize: '12px',
              border: color.locked ? '1px solid #FFD700' : '1px solid #ddd',
              borderRadius: '4px',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              backgroundColor: color.locked ? '#FFF8E0' : '#fff',
              cursor: color.locked ? 'not-allowed' : 'text',
              transition: 'all 0.3s ease',
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
          disabled={color.locked}
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '4px',
            background: `var(--slider-gradient, ${hueGradient})`,
            appearance: 'none',
            WebkitAppearance: 'none',
            cursor: color.locked ? 'not-allowed' : 'pointer',
            opacity: color.locked ? 0.5 : 1,
            ...sliderStyle,
            transition: 'opacity 0.3s ease',
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
          input[type="range"]:disabled::-webkit-slider-thumb {
            cursor: not-allowed;
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
          input[type="range"]:disabled::-moz-range-thumb {
            cursor: not-allowed;
          }
        `}</style>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        {recommendedColors.map((recColor, idx) => (
          <button
            key={idx}
            onClick={() => handleRecommendClick(recColor)}
            title={color.locked ? '颜色已锁定' : recColor}
            disabled={color.locked}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: recColor,
              border: color.locked ? '2px solid #ccc' : '2px solid #fff',
              boxShadow: color.locked ? 'none' : '0 1px 3px rgba(0,0,0,0.2)',
              cursor: color.locked ? 'not-allowed' : 'pointer',
              padding: 0,
              opacity: color.locked ? 0.4 : 1,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!color.locked) {
                (e.target as HTMLButtonElement).style.transform = 'scale(1.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (!color.locked) {
                (e.target as HTMLButtonElement).style.transform = 'scale(1)';
              }
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ColorEditor;
