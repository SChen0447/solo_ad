import { useState, useEffect, useRef } from 'react';
import { hsvToHex, hexToHsv, hexToRgba, MAX_COLOR_HISTORY } from '../utils/gridUtils';

interface ColorPickerProps {
  isOpen: boolean;
  position: { x: number; y: number };
  initialColor?: string;
  colorHistory: string[];
  onConfirm: (color: string) => void;
  onClose: () => void;
  onAddToHistory: (color: string) => void;
}

export default function ColorPicker({
  isOpen,
  position,
  initialColor = '#4fc3f7',
  colorHistory,
  onConfirm,
  onClose,
  onAddToHistory
}: ColorPickerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const saturationRef = useRef<HTMLDivElement>(null);

  const [hsv, setHsv] = useState(() => hexToHsv(initialColor));
  const [alpha, setAlpha] = useState(1);
  const [hexInput, setHexInput] = useState(initialColor);

  useEffect(() => {
    const hsvVal = hexToHsv(initialColor);
    setHsv(hsvVal);
    setHexInput(initialColor);
  }, [initialColor, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentColor = hsvToHex(hsv.h, hsv.s, hsv.v);
  const displayColor = hexToRgba(currentColor, alpha);

  const handleSaturationClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!saturationRef.current) return;
    const rect = saturationRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setHsv({ h: hsv.h, s: x, v: 1 - y });
  };

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHsv({ ...hsv, h: parseFloat(e.target.value) / 360 });
  };

  const handleAlphaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAlpha(parseFloat(e.target.value));
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      setHsv(hexToHsv(val));
    }
  };

  const handleConfirm = () => {
    onAddToHistory(currentColor);
    onConfirm(displayColor);
    onClose();
  };

  const handleHistoryClick = (color: string) => {
    setHsv(hexToHsv(color));
    setHexInput(color);
    setAlpha(1);
  };

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        backgroundColor: '#282840',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        zIndex: 1000,
        width: '260px',
        animation: 'pickerFadeIn 0.2s ease-out'
      }}
    >
      <style>{`
        @keyframes pickerFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div
        ref={saturationRef}
        onClick={handleSaturationClick}
        style={{
          width: '100%',
          height: '140px',
          borderRadius: '6px',
          marginBottom: '12px',
          position: 'relative',
          background: `linear-gradient(to top, #000, transparent),
                       linear-gradient(to right, #fff, hsl(${hsv.h * 360}, 100%, 50%))`,
          cursor: 'crosshair'
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            width: '14px',
            height: '14px',
            border: '2px solid #fff',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 4px rgba(0,0,0,0.5)'
          }}
        />
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label style={{ fontSize: '12px', color: '#a0a0c0', display: 'block', marginBottom: '4px' }}>
          色相
        </label>
        <input
          type="range"
          min="0"
          max="360"
          value={hsv.h * 360}
          onChange={handleHueChange}
          style={{
            width: '100%',
            height: '12px',
            borderRadius: '6px',
            background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
          }}
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '12px', color: '#a0a0c0', display: 'block', marginBottom: '4px' }}>
          透明度: {Math.round(alpha * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={alpha}
          onChange={handleAlphaChange}
          style={{
            width: '100%',
            height: '12px',
            borderRadius: '6px',
            background: `linear-gradient(to right, transparent, ${currentColor}),
                         repeating-conic-gradient(#888 0% 25%, transparent 0% 50%) 50% / 8px 8px`
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '6px',
            backgroundColor: displayColor,
            border: '1px solid #4a4a6a',
            flexShrink: 0
          }}
        />
        <input
          type="text"
          value={hexInput}
          onChange={handleHexChange}
          placeholder="#RRGGBB"
          style={{
            flex: 1,
            backgroundColor: '#1e1e2e',
            border: '1px solid #4a4a6a',
            borderRadius: '6px',
            padding: '8px 10px',
            color: '#e0e0e0',
            fontSize: '13px',
            fontFamily: 'monospace',
            outline: 'none'
          }}
        />
      </div>

      {colorHistory.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', color: '#a0a0c0', display: 'block', marginBottom: '6px' }}>
            最近使用
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {colorHistory.slice(0, MAX_COLOR_HISTORY).map((color, idx) => (
              <button
                key={idx}
                onClick={() => handleHistoryClick(color)}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  backgroundColor: color,
                  border: '1px solid #4a4a6a',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'transform 0.15s ease'
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #4a4a6a',
            backgroundColor: 'transparent',
            color: '#a0a0c0',
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'background-color 0.15s ease'
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3a3a5a')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          取消
        </button>
        <button
          onClick={handleConfirm}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#4fc3f7',
            color: '#1e1e2e',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'background-color 0.15s ease'
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#81d4fa')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#4fc3f7')}
        >
          确认
        </button>
      </div>
    </div>
  );
}
