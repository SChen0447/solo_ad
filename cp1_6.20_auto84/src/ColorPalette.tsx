import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ColorPaletteData, ColorToken, HSL,
  hexToHsl, hslToHex, getContrastText, getAllTokens
} from './colorUtils';

interface ColorPaletteProps {
  palette: ColorPaletteData;
  selectedKey: string | null;
  onSelectKey: (key: string | null) => void;
  onUpdateColor: (key: string, hex: string) => void;
}

const SWATCH_SIZE = 80;
const GAP = 12;

interface SwatchProps {
  token: ColorToken;
  selected: boolean;
  onSelect: (key: string) => void;
}

const Swatch: React.FC<SwatchProps> = React.memo(({ token, selected, onSelect }) => {
  const textColor = useMemo(() => getContrastText(token.hex), [token.hex]);
  return (
    <div
      onClick={() => onSelect(token.key)}
      style={{
        position: 'relative',
        width: SWATCH_SIZE,
        height: SWATCH_SIZE,
        borderRadius: 10,
        background: token.hex,
        cursor: 'pointer',
        transform: selected ? 'scale(1.1)' : 'scale(1)',
        transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: selected ? `0 8px 20px ${token.hex}55` : '0 2px 6px rgba(0,0,0,0.08)',
        border: token.hex.toUpperCase() === '#FFFFFF' ? '1px solid #eee' : 'none',
        overflow: 'hidden',
        zIndex: selected ? 2 : 1,
        userSelect: 'none'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255,255,255,0)',
          transition: 'background 0.2s ease',
          pointerEvents: 'none'
        }}
        className="swatch-hover-mask"
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.2)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0)'; }}
      />
      <div
        style={{
          position: 'absolute',
          top: 4,
          left: 6,
          fontSize: 11,
          fontWeight: 500,
          color: textColor,
          opacity: 0.85
        }}
      >
        {token.name}
      </div>
      {selected && (
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 14,
            fontWeight: 600,
            color: textColor,
            letterSpacing: 0.3,
            animation: 'swatchPop 0.2s ease-out'
          }}
        >
          {token.hex.toUpperCase()}
        </div>
      )}
      <style>{`
        @keyframes swatchPop {
          0% { transform: translateY(4px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .swatch-hover-mask:hover { background: rgba(255,255,255,0.2) !important; }
      `}</style>
    </div>
  );
});

Swatch.displayName = 'Swatch';

interface HSLSlidersProps {
  token: ColorToken;
  onChange: (hsl: HSL) => void;
}

const HSLSliders: React.FC<HSLSlidersProps> = ({ token, onChange }) => {
  const initialHsl = useMemo(() => hexToHsl(token.hex), [token.hex]);
  const [hsl, setHsl] = useState<HSL>(initialHsl);
  const rafRef = useRef<number | null>(null);
  const latestRef = useRef<HSL>(initialHsl);

  useEffect(() => {
    setHsl(initialHsl);
    latestRef.current = initialHsl;
  }, [token.hex, initialHsl]);

  const scheduleUpdate = (next: HSL) => {
    latestRef.current = next;
    setHsl(next);
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      onChange(latestRef.current);
    });
  };

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const gradientBg = (type: 'h' | 's' | 'l') => {
    if (type === 'h') {
      return 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)';
    }
    if (type === 's') {
      const base = hslToHex({ h: hsl.h, s: 0, l: hsl.l });
      const full = hslToHex({ h: hsl.h, s: 100, l: hsl.l });
      return `linear-gradient(to right, ${base}, ${full})`;
    }
    const base = hslToHex({ h: hsl.h, s: hsl.s, l: 0 });
    const mid = hslToHex({ h: hsl.h, s: hsl.s, l: 50 });
    const full = hslToHex({ h: hsl.h, s: hsl.s, l: 100 });
    return `linear-gradient(to right, ${base}, ${mid}, ${full})`;
  };

  const sliderStyle = (type: 'h' | 's' | 'l') => ({
    label: type === 'h' ? 'Hue 色相' : type === 's' ? 'Saturation 饱和度' : 'Lightness 明度',
    min: type === 'h' ? 0 : 0 : 0,
    max: type === 'h' ? 360 : 100 : 100,
    value: type === 'h' ? hsl.h : type === 's' ? hsl.s : hsl.l,
    onChange: (v: number) => {
      const next = { ...hsl, [type]: v };
      scheduleUpdate(next);
    }
  });

  const rangeTrack = (bg: string): React.CSSProperties => ({
    width: '100%',
    height: 28,
    borderRadius: 6,
    background: bg,
    position: 'relative',
    marginBottom: 14
  });

  const thumbStyle: React.CSSProperties = {
    position: 'absolute',
    top: -3,
    width: 20,
    height: 34,
    borderRadius: 5,
    border: '2px solid #fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
    pointerEvents: 'none'
  };

  const percent = (val: number, max: number) => (val / max) * 100;

  const renderTrack = (type: 'h' | 's' | 'l') => {
    const cfg = sliderStyle(type);
    const bg = gradientBg(type);
    return (
      <div key={type}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: '#555' }}>
          <span>{cfg.label}</span>
          <span style={{ fontWeight: 600 }}>{cfg.value}</span>
        </div>
        <div style={rangeTrack(bg)}>
          <div
            style={{
            ...thumbStyle,
            left: `calc(${percent(cfg.value, cfg.max)}% - 10px)`,
            background: type === 'h'
              ? `hsl(${cfg.value}, 85%, 55%)`
              : hslToHex({ h: hsl.h, s: type === 's' ? cfg.value : hsl.s, l: type === 'l' ? cfg.value : hsl.l }),
          }}
          />
          <input
            type="range"
            min={cfg.min}
            max={cfg.max}
            value={cfg.value}
            onChange={(e) => cfg.onChange(parseInt(e.target.value, 10))}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              margin: 0
            }}
          />
        </div>
      </div>
    );
  };

  const textColor = getContrastText(token.hex);

  return (
    <div
      style={{
        marginTop: 16,
        padding: 18,
        borderRadius: 12,
        border: '1px solid #e8e8e8',
        background: '#fafafa',
        animation: 'slideDown 0.25s ease-out'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            background: token.hex,
            border: '1px solid rgba(0,0,0,0.05)',
            flexShrink: 0
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#666' }}>当前色值</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#222', letterSpacing: 0.5 }}>
            {hslToHex(hsl)}
          </div>
        </div>
      </div>
      {renderTrack('h')}
      {renderTrack('s')}
      {renderTrack('l')}
      <style>{`
        @keyframes slideDown {
          0% { transform: translateY(-6px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .slider-hidden-input { display: none; }
      `}</style>
      <div style={{ display: 'none' }} className="slider-hidden-input">{textColor}</div>
    </div>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
    color: '#666',
    marginBottom: 10,
    marginTop: 4
  }}>
    {children}
  </div>
);

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  palette,
  selectedKey,
  onSelectKey,
  onUpdateColor
}) => {
  const tokens = getAllTokens(palette);
  const primarySection = tokens.filter(t => t.category === 'primary');
  const secondarySection = tokens.filter(t => t.category === 'secondary');
  const neutralSection = tokens.filter(t => t.category === 'neutral');
  const functionalSection = tokens.filter(t => t.category === 'functional');

  const selectedToken = tokens.find(t => t.key === selectedKey) || null;

  const handleHslChange = (key: string) => (hsl: HSL) => {
    onUpdateColor(key, hslToHex(hsl));
  };

  const gridWrap: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: GAP,
    padding: '10px 4px'
  };

  const pageBgStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: `radial-gradient(circle at 20% 20%, ${withAlphaFallback(palette.primary.hex, 0.08)}, transparent 60%), radial-gradient(circle at 80% 0%, ${withAlphaFallback(palette.secondary[0].hex, 0.06)}, transparent 55%)`,
    transition: 'background 0.3s ease',
    pointerEvents: 'none',
    zIndex: 0
  };

  return (
    <div style={{ position: 'relative', height: '100% }}>
      <div style={pageBgStyle} />
      <div style={{ position: 'relative', zIndex: 1, padding: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 18, letterSpacing: 0.3 }}>
          调色板编辑
        </div>

        <SectionTitle>主色 Primary</SectionTitle>
        <div style={gridWrap}>
          {primarySection.map(t => (
            <Swatch
              key={t.key}
              token={t}
              selected={selectedKey === t.key}
              onSelect={onSelectKey}
            />
          ))}
        </div>

        {palette.variants.primaryShades.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 2, padding: '0 4px 0 4px' }}>
            {palette.variants.primaryShades.map((shade, i) => (
              <div
                key={`sh-${i}`}
                title={`明度 ${shade}`}
                style={{
                  flex: 1,
                  height: 18,
                  borderRadius: 3,
                  background: shade,
                  transition: 'transform 0.2s',
                  cursor: 'default',
                  border: shade.toUpperCase() === '#FFFFFF' ? '1px solid #eee' : 'none'
                }}
              />
            ))}
          </div>
        )}

        <div style={{ height: 8 }} />
        <SectionTitle>辅色 Secondary（2个）</SectionTitle>
        <div style={gridWrap}>
          {secondarySection.map(t => (
            <Swatch
              key={t.key}
              token={t}
              selected={selectedKey === t.key}
              onSelect={onSelectKey}
            />
          ))}
        </div>

        <div style={{ height: 8 }} />
        <SectionTitle>中性色 Neutral</SectionTitle>
        <div style={gridWrap}>
          {neutralSection.map(t => (
            <Swatch
              key={t.key}
              token={t}
              selected={selectedKey === t.key}
              onSelect={onSelectKey}
            />
          ))}
        </div>

        <div style={{ height: 8 }} />
        <SectionTitle>功能色 Functional</SectionTitle>
        <div style={gridWrap}>
          {functionalSection.map(t => (
            <Swatch
              key={t.key}
              token={t}
              selected={selectedKey === t.key}
              onSelect={onSelectKey}
            />
          ))}
        </div>

        {selectedToken && (
          <HSLSliders
            token={selectedToken}
            onChange={handleHslChange(selectedToken.key)}
          />
        )}
      </div>
    </div>
  );
};

function withAlphaFallback(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default ColorPalette;
