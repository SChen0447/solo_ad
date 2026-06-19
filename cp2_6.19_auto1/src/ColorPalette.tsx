import React from 'react';
import { HSV, hsvToHex, hsvToRgb } from './ColorPicker';

export interface ColorScheme {
  name: string;
  nameEn: string;
  colors: HSV[];
}

function generateSchemes(hsv: HSV): ColorScheme[] {
  const { h, s, v } = hsv;

  const complementary: ColorScheme = {
    name: '互补色',
    nameEn: 'Complementary',
    colors: [
      { h, s, v },
      { h: (h + 180) % 360, s, v },
      { h, s: Math.max(0.2, s * 0.5), v: Math.min(1, v * 1.2) },
      { h: (h + 180) % 360, s: Math.max(0.2, s * 0.5), v: Math.min(1, v * 1.2) },
      { h, s: Math.min(1, s * 1.1), v: Math.max(0.3, v * 0.6) },
    ],
  };

  const analogous: ColorScheme = {
    name: '类似色',
    nameEn: 'Analogous',
    colors: [
      { h: (h - 30 + 360) % 360, s, v },
      { h: (h - 15 + 360) % 360, s, v },
      { h, s, v },
      { h: (h + 15) % 360, s, v },
      { h: (h + 30) % 360, s, v },
    ],
  };

  const triadic: ColorScheme = {
    name: '三色组合',
    nameEn: 'Triadic',
    colors: [
      { h, s, v },
      { h: (h + 120) % 360, s, v },
      { h: (h + 240) % 360, s, v },
      { h, s: Math.max(0.2, s * 0.4), v: Math.min(1, v * 1.15) },
      { h: (h + 120) % 360, s: Math.max(0.2, s * 0.4), v: Math.min(1, v * 1.15) },
    ],
  };

  const splitComplementary: ColorScheme = {
    name: '分裂互补',
    nameEn: 'Split-Complementary',
    colors: [
      { h, s, v },
      { h: (h + 150) % 360, s, v },
      { h: (h + 210) % 360, s, v },
      { h: (h + 150) % 360, s: Math.max(0.2, s * 0.6), v: Math.min(1, v * 1.1) },
      { h: (h + 210) % 360, s: Math.max(0.2, s * 0.6), v: Math.min(1, v * 1.1) },
    ],
  };

  const tetradic: ColorScheme = {
    name: '四色组合',
    nameEn: 'Tetradic',
    colors: [
      { h, s, v },
      { h: (h + 90) % 360, s, v },
      { h: (h + 180) % 360, s, v },
      { h: (h + 270) % 360, s, v },
      { h, s: Math.max(0.2, s * 0.3), v: Math.min(1, v * 1.2) },
    ],
  };

  return [complementary, analogous, triadic, splitComplementary, tetradic];
}

interface ColorPaletteProps {
  hsv: HSV;
  onSelectColor: (hsv: HSV) => void;
  onSaveScheme: (scheme: ColorScheme) => void;
}

const paletteStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '20px',
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  cardHeader: {
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#e0e0e0',
  },
  cardSubtitle: {
    fontSize: '11px',
    color: '#6c63ff',
    letterSpacing: '0.5px',
  },
  colorStrip: {
    display: 'flex',
    height: '64px',
  },
  colorBlock: {
    flex: 1,
    position: 'relative' as const,
    transition: 'flex 0.3s ease',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: '6px',
  },
  colorBlockHex: {
    fontSize: '9px',
    fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
    color: 'rgba(255,255,255,0.85)',
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
    letterSpacing: '0.3px',
  },
  cardActions: {
    padding: '10px 16px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  saveBtn: {
    background: 'rgba(108, 99, 255, 0.15)',
    color: '#6c63ff',
    border: '1px solid rgba(108, 99, 255, 0.3)',
    padding: '4px 14px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
};

const ColorPalette: React.FC<ColorPaletteProps> = ({ hsv, onSelectColor, onSaveScheme }) => {
  const schemes = generateSchemes(hsv);

  return (
    <div style={paletteStyles.container}>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#e0e0e0', marginBottom: '4px' }}>
        配色方案
      </h2>
      <p style={{ fontSize: '13px', color: '#6a6a8a', marginBottom: '4px' }}>
        点击色块设为新主色
      </p>
      {schemes.map((scheme) => (
        <div
          key={scheme.nameEn}
          style={paletteStyles.card}
          className="scheme-card"
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.transform = 'translateY(-3px)';
            el.style.boxShadow = '0 8px 24px rgba(108, 99, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.transform = 'translateY(0)';
            el.style.boxShadow = 'none';
          }}
        >
          <div style={paletteStyles.cardHeader}>
            <span style={paletteStyles.cardTitle}>{scheme.name}</span>
            <span style={paletteStyles.cardSubtitle}>{scheme.nameEn}</span>
          </div>
          <div style={paletteStyles.colorStrip}>
            {scheme.colors.map((c, i) => {
              const hex = hsvToHex(c);
              const rgb = hsvToRgb(c);
              const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
              return (
                <div
                  key={i}
                  style={{
                    ...paletteStyles.colorBlock,
                    backgroundColor: hex,
                  }}
                  className="color-block"
                  onClick={() => onSelectColor(c)}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.flex = '1.5';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.flex = '1';
                  }}
                >
                  <span
                    style={{
                      ...paletteStyles.colorBlockHex,
                      color: brightness > 128 ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.85)',
                      textShadow:
                        brightness > 128
                          ? '0 1px 2px rgba(255,255,255,0.3)'
                          : '0 1px 3px rgba(0,0,0,0.5)',
                    }}
                  >
                    {hex.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={paletteStyles.cardActions}>
            <button
              style={paletteStyles.saveBtn}
              onClick={(e) => {
                e.stopPropagation();
                onSaveScheme(scheme);
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'rgba(108, 99, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'rgba(108, 99, 255, 0.15)';
              }}
            >
              ♡ 收藏
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ColorPalette;
