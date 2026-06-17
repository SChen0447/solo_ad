import { useState, useRef, useEffect } from 'react';
import { ColorInfo } from '../types';

interface ColorPaletteProps {
  colors: ColorInfo[];
  onColorChange: (index: number, newHex: string) => void;
  onToggleLock: (index: number) => void;
}

export default function ColorPalette({ colors, onColorChange, onToggleLock }: ColorPaletteProps) {
  const [activePicker, setActivePicker] = useState<number | null>(null);
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activePicker === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setActivePicker(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activePicker]);

  const handleSwatchClick = (index: number, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPickerPos({ x: rect.left, y: rect.bottom + 8 });
    setActivePicker(activePicker === index ? null : index);
  };

  const handleHexInput = (index: number, value: string) => {
    const cleaned = value.replace(/[^0-9a-fA-F#]/g, '');
    if (/^#[0-9a-fA-F]{0,6}$/.test(cleaned) || cleaned === '' || cleaned === '#') {
      if (cleaned.length === 7 || cleaned.length === 4) {
        onColorChange(index, cleaned);
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.swatches}>
        {colors.map((color, i) => (
          <div key={i} style={styles.swatchWrapper}>
            <div style={{ position: 'relative' }}>
              <div
                className="color-swatch"
                style={{
                  ...styles.swatch,
                  background: color.hex,
                }}
                onClick={(e) => handleSwatchClick(i, e)}
                title={color.hex}
              />
              <button
                style={{
                  ...styles.lockBtn,
                  color: color.locked ? '#FFD54F' : '#666',
                }}
                onClick={() => onToggleLock(i)}
                title={color.locked ? '解锁颜色' : '锁定颜色'}
              >
                {color.locked ? '🔒' : '🔓'}
              </button>
            </div>
            <div style={styles.percentage}>{color.percentage.toFixed(1)}%</div>
            <div style={styles.hexLabel}>{color.hex}</div>
          </div>
        ))}
      </div>

      {activePicker !== null && (
        <div
          ref={pickerRef}
          style={{
            ...styles.picker,
            left: pickerPos.x,
            top: pickerPos.y,
          }}
        >
          <div style={styles.pickerContent}>
            <input
              type="color"
              value={colors[activePicker].hex}
              onChange={(e) => onColorChange(activePicker, e.target.value)}
              style={styles.colorInput}
            />
            <div style={styles.pickerControls}>
              <input
                type="text"
                value={colors[activePicker].hex}
                onChange={(e) => handleHexInput(activePicker, e.target.value)}
                style={styles.hexInput}
                maxLength={7}
              />
              <span style={styles.pickerLabel}>
                {activePicker + 1}号色
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
  },
  swatches: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  swatchWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  swatch: {
    width: '60px',
    height: '60px',
    borderRadius: '8px',
    border: '1px solid #333',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
  },
  lockBtn: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    width: '20px',
    height: '20px',
    border: 'none',
    background: '#1e1e1e',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    lineHeight: 1,
  },
  percentage: {
    fontSize: '12px',
    color: '#9e9e9e',
  },
  hexLabel: {
    fontSize: '11px',
    color: '#9e9e9e',
    fontFamily: 'monospace',
  },
  picker: {
    position: 'fixed',
    zIndex: 1000,
    background: '#1e1e1e',
    border: '1px solid #555',
    borderRadius: '12px',
    padding: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    animation: 'fadeIn 0.2s ease',
  },
  pickerContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  colorInput: {
    width: '120px',
    height: '120px',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    background: 'transparent',
    padding: 0,
  },
  pickerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  hexInput: {
    width: '80px',
    padding: '4px 8px',
    background: '#333',
    border: '1px solid #555',
    borderRadius: '6px',
    color: '#e0e0e0',
    fontFamily: 'monospace',
    fontSize: '13px',
    textAlign: 'center',
  },
  pickerLabel: {
    fontSize: '12px',
    color: '#9e9e9e',
  },
};
