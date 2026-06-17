import { useState, useRef, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';

interface ColorInfo {
  hex: string;
  percentage: number;
  locked: boolean;
}

interface ColorPaletteProps {
  colors: ColorInfo[];
  onColorChange: (index: number, hex: string) => void;
  onLockToggle: (index: number) => void;
}

function ColorPalette({ colors, onColorChange, onLockToggle }: ColorPaletteProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setActiveIndex(null);
      }
    }
    if (activeIndex !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeIndex]);

  function handleHexInput(index: number, value: string) {
    const hex = value.startsWith('#') ? value : `#${value}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onColorChange(index, hex);
    }
  }

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', position: 'relative' }}>
      {colors.map((color, index) => (
        <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
          <div
            ref={(el) => { blockRefs.current[index] = el; }}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '8px',
              border: '1px solid #333',
              backgroundColor: color.hex,
              cursor: 'pointer',
              position: 'relative',
              transition: 'transform 0.2s',
            }}
            onClick={() => setActiveIndex(activeIndex === index ? null : index)}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.15)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-30px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#333',
                color: '#fff',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                opacity: 0,
                transition: 'opacity 0.2s',
              }}
              className="hex-tooltip"
            />
            <button
              onClick={(e) => { e.stopPropagation(); onLockToggle(index); }}
              style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                padding: 0,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 0,
              }}
            >
              {color.locked ? (
                <Lock size={18} color="#FFD54F" />
              ) : (
                <Unlock size={18} color="#9e9e9e" />
              )}
            </button>
          </div>
          <span style={{ color: '#9e9e9e', fontSize: '12px', marginTop: '4px' }}>
            {color.percentage.toFixed(1)}%
          </span>
          {activeIndex === index && (
            <div
              ref={popupRef}
              style={{
                position: 'absolute',
                top: '68px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                zIndex: 100,
                animation: 'fadeIn 0.2s ease-in-out',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="color"
                value={color.hex}
                onChange={(e) => onColorChange(index, e.target.value)}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  background: 'transparent',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                }}
              />
              <input
                type="text"
                value={color.hex}
                onChange={(e) => handleHexInput(index, e.target.value)}
                style={{
                  width: '80px',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  color: '#e0e0e0',
                  padding: '4px 6px',
                  fontSize: '13px',
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
              <span style={{ color: '#9e9e9e', fontSize: '11px' }}>
                Use eyedropper to pick color
              </span>
            </div>
          )}
        </div>
      ))}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        div:hover > .hex-tooltip {
          opacity: 1 !important;
        }
        input[type="color"]::-webkit-color-swatch-wrapper {
          padding: 0;
          border-radius: 50%;
        }
        input[type="color"]::-webkit-color-swatch {
          border: 2px solid #555;
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
}

export default ColorPalette;
