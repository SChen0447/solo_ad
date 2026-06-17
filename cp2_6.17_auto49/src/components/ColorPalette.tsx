import { useState, useRef, useEffect, useCallback } from 'react';
import { ColorInfo } from '../types';

interface ColorPaletteProps {
  colors: ColorInfo[];
  onColorChange: (index: number, newHex: string) => void;
  onToggleLock: (index: number) => void;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function CircularColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (hex: string) => void;
}) {
  const wheelRef = useRef<HTMLCanvasElement>(null);
  const [localHsl, setLocalHsl] = useState(() => hexToHsl(color));
  const [dragging, setDragging] = useState(false);
  const [lightness, setLightness] = useState(() => hexToHsl(color).l);
  const wheelSize = 160;
  const radius = wheelSize / 2 - 10;

  useEffect(() => {
    const hsl = hexToHsl(color);
    setLocalHsl(hsl);
    setLightness(hsl.l);
  }, [color]);

  const drawWheel = useCallback(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cx = wheelSize / 2;
    const cy = wheelSize / 2;

    ctx.clearRect(0, 0, wheelSize, wheelSize);

    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = ((angle - 1) * Math.PI) / 180;
      const endAngle = ((angle + 1) * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = `hsl(${angle}, 100%, ${lightness}%)`;
      ctx.fill();
    }

    const indicatorAngle = (localHsl.h * Math.PI) / 180;
    const indicatorDist = (localHsl.s / 100) * radius;
    const ix = cx + indicatorDist * Math.cos(indicatorAngle);
    const iy = cy + indicatorDist * Math.sin(indicatorAngle);

    ctx.beginPath();
    ctx.arc(ix, iy, 7, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ix, iy, 5, 0, Math.PI * 2);
    ctx.fillStyle = hslToHex(localHsl.h, localHsl.s, lightness);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [localHsl, lightness, radius]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  const getHslFromPos = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = wheelRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left - wheelSize / 2;
      const y = clientY - rect.top - wheelSize / 2;
      let dist = Math.sqrt(x * x + y * y);
      if (dist > radius) dist = radius;
      const angle = (Math.atan2(y, x) * 180) / Math.PI;
      const h = ((angle % 360) + 360) % 360;
      const s = (dist / radius) * 100;
      const newHex = hslToHex(h, s, lightness);
      setLocalHsl({ h, s, l: lightness });
      onChange(newHex);
    },
    [lightness, onChange]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      getHslFromPos(e.clientX, e.clientY);
    },
    [getHslFromPos]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      getHslFromPos(e.clientX, e.clientY);
    },
    [dragging, getHslFromPos]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleEyedropper = useCallback(async () => {
    if (!(window as any).EyeDropper) {
      return;
    }
    try {
      const dropper = new (window as any).EyeDropper();
      const result = await dropper.open();
      onChange(result.sRGBHex);
    } catch {}
  }, [onChange]);

  const handleLightnessChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      setLightness(val);
      const newHex = hslToHex(localHsl.h, localHsl.s, val);
      onChange(newHex);
    },
    [localHsl.h, localHsl.s, onChange]
  );

  const handleHexTyping = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        onChange(val);
      }
    },
    [onChange]
  );

  return (
    <div style={pickerStyles.container}>
      <canvas
        ref={wheelRef}
        width={wheelSize}
        height={wheelSize}
        style={pickerStyles.wheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <div style={pickerStyles.controls}>
        <div style={pickerStyles.sliderRow}>
          <span style={pickerStyles.sliderLabel}>亮度</span>
          <input
            type="range"
            min="5"
            max="95"
            value={lightness}
            onChange={handleLightnessChange}
            style={pickerStyles.slider}
          />
        </div>
        <div style={pickerStyles.hexRow}>
          <input
            type="text"
            value={color}
            onChange={handleHexTyping}
            style={pickerStyles.hexInput}
            maxLength={7}
          />
          {(window as any).EyeDropper && (
            <button style={pickerStyles.eyedropperBtn} onClick={handleEyedropper} title="吸管工具">
              💉
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ColorPalette({ colors, onColorChange, onToggleLock }: ColorPaletteProps) {
  const [activePicker, setActivePicker] = useState<number | null>(null);
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });
  const pickerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (activePicker === null) {
      setVisible(false);
      return;
    }
    requestAnimationFrame(() => setVisible(true));
  }, [activePicker]);

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
    const viewportW = window.innerWidth;
    const pickerW = 200;
    let x = rect.left;
    if (x + pickerW > viewportW - 16) {
      x = viewportW - pickerW - 16;
    }
    setPickerPos({ x, y: rect.bottom + 8 });
    setActivePicker(activePicker === index ? null : index);
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
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.95)',
          }}
        >
          <CircularColorPicker
            color={colors[activePicker].hex}
            onChange={(hex) => onColorChange(activePicker, hex)}
          />
          <div style={styles.pickerFooter}>
            {activePicker + 1}号色
          </div>
        </div>
      )}
    </div>
  );
}

const pickerStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  wheel: {
    cursor: 'crosshair',
    borderRadius: '50%',
    touchAction: 'none',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sliderLabel: {
    fontSize: '11px',
    color: '#9e9e9e',
    whiteSpace: 'nowrap',
  },
  slider: {
    flex: 1,
    accentColor: '#64ffda',
    height: '4px',
  },
  hexRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  hexInput: {
    flex: 1,
    padding: '4px 8px',
    background: '#333',
    border: '1px solid #555',
    borderRadius: '6px',
    color: '#e0e0e0',
    fontFamily: 'monospace',
    fontSize: '13px',
    textAlign: 'center',
  },
  eyedropperBtn: {
    padding: '4px 8px',
    background: '#333',
    border: '1px solid #555',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
};

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
    transition: 'opacity 0.2s ease, transform 0.2s ease',
  },
  pickerFooter: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#9e9e9e',
    marginTop: '4px',
  },
};
