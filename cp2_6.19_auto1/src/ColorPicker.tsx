import React, { useCallback, useRef, useEffect, useState } from 'react';

export interface HSV {
  h: number;
  s: number;
  v: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export function hsvToRgb(hsv: HSV): RGB {
  const { h, s, v } = hsv;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r1: number, g1: number, b1: number;
  if (h < 60) { r1 = c; g1 = x; b1 = 0; }
  else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export function rgbToHsv(rgb: RGB): HSV {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function hexToRgb(hex: string): RGB | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hsvToHex(hsv: HSV): string {
  return rgbToHex(hsvToRgb(hsv));
}

interface ColorPickerProps {
  hsv: HSV;
  onChange: (hsv: HSV) => void;
}

const HUE_RING_SIZE = 220;
const HUE_RING_THICKNESS = 22;
const HUE_RING_OUTER_RADIUS = HUE_RING_SIZE / 2;
const HUE_RING_INNER_RADIUS = HUE_RING_OUTER_RADIUS - HUE_RING_THICKNESS;
const HUE_RING_MIDDLE_RADIUS = (HUE_RING_INNER_RADIUS + HUE_RING_OUTER_RADIUS) / 2;
const SV_PANEL_SIZE = 220;

const pickerStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    width: '100%',
    maxWidth: '300px',
    padding: '20px',
  },
  hueWrapper: {
    position: 'relative',
    width: HUE_RING_SIZE,
    height: HUE_RING_SIZE,
    cursor: 'pointer',
  },
  hueRing: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    background: 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
    position: 'relative',
  },
  hueInner: {
    position: 'absolute',
    top: HUE_RING_THICKNESS,
    left: HUE_RING_THICKNESS,
    right: HUE_RING_THICKNESS,
    bottom: HUE_RING_THICKNESS,
    borderRadius: '50%',
    background: '#1a1a2e',
    pointerEvents: 'none',
  },
  hueThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: '50%',
    border: '3px solid white',
    boxShadow: '0 0 4px rgba(0,0,0,0.5)',
    pointerEvents: 'none',
    transform: 'translate(-50%, -50%)',
    transition: 'box-shadow 0.2s ease',
  },
  svWrapper: {
    position: 'relative',
    width: SV_PANEL_SIZE,
    height: SV_PANEL_SIZE,
    borderRadius: '8px',
    overflow: 'hidden',
    cursor: 'crosshair',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  svWhite: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to right, #fff, transparent)',
  },
  svBlack: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to bottom, transparent, #000)',
  },
  svThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: '50%',
    border: '3px solid white',
    boxShadow: '0 0 4px rgba(0,0,0,0.5)',
    pointerEvents: 'none',
    transform: 'translate(-50%, -50%)',
  },
  colorPreview: {
    width: '100%',
    height: '48px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    transition: 'background-color 0.1s ease',
  },
  valuesContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  valueRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 10px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '6px',
    fontSize: '13px',
  },
  valueLabel: {
    color: '#8888aa',
    fontWeight: 600,
    fontSize: '11px',
    letterSpacing: '0.5px',
  },
  valueText: {
    fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
    fontSize: '13px',
    color: '#e0e0e0',
    letterSpacing: '0.3px',
  },
};

function getHueFromEvent(e: React.MouseEvent | MouseEvent, wrapper: HTMLDivElement): { h: number; onRing: boolean } {
  const rect = wrapper.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = e.clientX - cx;
  const dy = e.clientY - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const outerR = rect.width / 2;
  const innerR = outerR - HUE_RING_THICKNESS;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  const onRing = dist >= innerR && dist <= outerR;
  return { h: angle, onRing };
}

function getHueThumbPos(hue: number): { x: number; y: number } {
  const rad = (hue - 90) * (Math.PI / 180);
  return {
    x: HUE_RING_SIZE / 2 + HUE_RING_MIDDLE_RADIUS * Math.cos(rad),
    y: HUE_RING_SIZE / 2 + HUE_RING_MIDDLE_RADIUS * Math.sin(rad),
  };
}

function getSVFromEvent(
  e: React.MouseEvent | MouseEvent,
  wrapper: HTMLDivElement
): { s: number; v: number } {
  const rect = wrapper.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;
  x = Math.max(0, Math.min(x, rect.width));
  y = Math.max(0, Math.min(y, rect.height));
  return {
    s: x / rect.width,
    v: 1 - y / rect.height,
  };
}

const ColorPicker: React.FC<ColorPickerProps> = ({ hsv, onChange }) => {
  const hueRef = useRef<HTMLDivElement>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const [draggingHue, setDraggingHue] = useState(false);
  const [draggingSV, setDraggingSV] = useState(false);
  const hsvRef = useRef(hsv);
  const onChangeRef = useRef(onChange);

  hsvRef.current = hsv;
  onChangeRef.current = onChange;

  const handleHueDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!hueRef.current) return;
      const result = getHueFromEvent(e, hueRef.current);
      if (!result.onRing) return;
      onChange({ ...hsv, h: result.h });
      setDraggingHue(true);
    },
    [hsv, onChange]
  );

  const handleSVDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!svRef.current) return;
      const { s, v } = getSVFromEvent(e, svRef.current);
      onChange({ h: hsv.h, s, v });
      setDraggingSV(true);
    },
    [hsv, onChange]
  );

  useEffect(() => {
    if (!draggingHue && !draggingSV) return;

    const handleMove = (e: MouseEvent) => {
      if (draggingHue && hueRef.current) {
        const result = getHueFromEvent(e, hueRef.current);
        onChangeRef.current({ ...hsvRef.current, h: result.h });
      }
      if (draggingSV && svRef.current) {
        const { s, v } = getSVFromEvent(e, svRef.current);
        onChangeRef.current({ h: hsvRef.current.h, s, v });
      }
    };

    const handleUp = () => {
      setDraggingHue(false);
      setDraggingSV(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [draggingHue, draggingSV]);

  const rgb = hsvToRgb(hsv);
  const hex = rgbToHex(rgb);
  const hsl = rgbToHsl(rgb);
  const huePos = getHueThumbPos(hsv.h);
  const pureHueRgb = hsvToRgb({ h: hsv.h, s: 1, v: 1 });
  const pureHueHex = rgbToHex(pureHueRgb);

  return (
    <div style={pickerStyles.container}>
      <div
        ref={hueRef}
        style={pickerStyles.hueWrapper}
        onMouseDown={handleHueDown}
      >
        <div style={pickerStyles.hueRing}>
          <div style={pickerStyles.hueInner} />
          <div
            style={{
              ...pickerStyles.hueThumb,
              left: huePos.x,
              top: huePos.y,
              backgroundColor: pureHueHex,
            }}
          />
        </div>
      </div>

      <div
        ref={svRef}
        style={{
          ...pickerStyles.svWrapper,
          backgroundColor: pureHueHex,
        }}
        onMouseDown={handleSVDown}
      >
        <div style={pickerStyles.svWhite} />
        <div style={pickerStyles.svBlack} />
        <div
          style={{
            ...pickerStyles.svThumb,
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            backgroundColor: hex,
          }}
        />
      </div>

      <div style={{ ...pickerStyles.colorPreview, backgroundColor: hex }} />

      <div style={pickerStyles.valuesContainer}>
        <div style={pickerStyles.valueRow}>
          <span style={pickerStyles.valueLabel}>HEX</span>
          <span style={pickerStyles.valueText}>{hex.toUpperCase()}</span>
        </div>
        <div style={pickerStyles.valueRow}>
          <span style={pickerStyles.valueLabel}>RGB</span>
          <span style={pickerStyles.valueText}>
            {rgb.r}, {rgb.g}, {rgb.b}
          </span>
        </div>
        <div style={pickerStyles.valueRow}>
          <span style={pickerStyles.valueLabel}>HSL</span>
          <span style={pickerStyles.valueText}>
            {hsl.h}°, {hsl.s}%, {hsl.l}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
