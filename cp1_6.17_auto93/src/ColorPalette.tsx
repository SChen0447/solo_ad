import { useState, useMemo } from 'react';
import { HSL, HSLOffset, hslToString, hslToHex } from './colorTheory';

interface ColorPaletteProps {
  colors: HSL[];
  offset: HSLOffset;
  onOffsetChange: (offset: HSLOffset) => void;
  lockedIndices: number[];
  onLockToggle: (index: number) => void;
  animationKey: number;
  primaryColor: HSL;
}

export default function ColorPalette({
  colors,
  offset,
  onOffsetChange,
  lockedIndices,
  onLockToggle,
  animationKey,
  primaryColor
}: ColorPaletteProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const primaryHex = useMemo(() => hslToHex(primaryColor), [primaryColor]);

  const handleCopy = async (hex: string, index: number) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      console.error('复制失败');
    }
  };

  const sliders: { key: keyof HSLOffset; label: string; min: number; max: number; unit: string }[] = [
    { key: 'h', label: '色相偏移', min: -30, max: 30, unit: '°' },
    { key: 's', label: '饱和度偏移', min: -20, max: 20, unit: '%' },
    { key: 'l', label: '明度偏移', min: -20, max: 20, unit: '%' }
  ];

  const trackFillPercent = (value: number, min: number, max: number): number => {
    return ((value - min) / (max - min)) * 100;
  };

  return (
    <div className="palette-wrapper">
      <div className="sliders-group">
        {sliders.map((slider) => (
          <div className="slider-row" key={slider.key}>
            <div className="slider-label">
              <span>{slider.label}</span>
              <span className="slider-value">
                {offset[slider.key] > 0 ? '+' : ''}{offset[slider.key]}{slider.unit}
              </span>
            </div>
            <div className="slider-container">
              <div className="slider-track">
                <div
                  className="slider-track-fill"
                  style={{
                    width: `${trackFillPercent(offset[slider.key], slider.min, slider.max)}%`,
                    backgroundColor: primaryHex
                  }}
                />
              </div>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                value={offset[slider.key]}
                onChange={(e) => onOffsetChange({ ...offset, [slider.key]: Number(e.target.value) })}
                className="custom-slider"
                style={{
                  // @ts-ignore
                  '--thumb-color': primaryHex,
                  '--track-height': '4px',
                  '--thumb-size': '12px'
                } as React.CSSProperties}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="palette-container" key={animationKey}>
        {colors.map((color, index) => {
          const hex = hslToHex(color);
          const isLocked = lockedIndices.includes(index);
          const textColor = color.l > 50 ? '#1a1a2e' : '#ffffff';

          return (
            <div
              className="color-card"
              key={`${animationKey}-${index}`}
              style={{
                animationDelay: `${index * 100}ms`,
                transition: 'all 300ms ease-in-out'
              }}
            >
              <div
                className="color-swatch"
                style={{
                  backgroundColor: hslToString(color),
                  transition: 'background-color 300ms ease-in-out'
                }}
              >
                <button
                  className={`lock-btn ${isLocked ? 'locked' : ''}`}
                  onClick={() => onLockToggle(index)}
                  title={isLocked ? '解锁' : '锁定'}
                >
                  <i className={`fa-solid ${isLocked ? 'fa-lock' : 'fa-lock-open'}`} />
                </button>
              </div>
              <div className="color-info" style={{ color: textColor }}>
                <div className="color-hex">{hex}</div>
                <div className="color-hsl">
                  HSL({color.h}, {color.s}%, {color.l}%)
                </div>
                <button
                  className="copy-btn"
                  onClick={() => handleCopy(hex, index)}
                  style={{
                    borderColor: textColor + '40',
                    color: textColor
                  }}
                >
                  {copiedIndex === index ? (
                    <><i className="fa-solid fa-check" /> 已复制</>
                  ) : (
                    <><i className="fa-regular fa-copy" /> 复制</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
