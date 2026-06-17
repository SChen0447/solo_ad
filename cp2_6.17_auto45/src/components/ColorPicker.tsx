import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const expandHex = (hex: string): string => {
  if (hex.length === 4 && hex[0] === '#') {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return hex;
};

const isValidHex = (val: string): boolean => {
  return /^#[0-9A-Fa-f]{3}$|^#[0-9A-Fa-f]{6}$/.test(val);
};

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [inputInvalid, setInputInvalid] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const eyeDropperSupported = useMemo(() => {
    return typeof window !== 'undefined' && 'EyeDropper' in window;
  }, []);

  const previewColor = useMemo(() => {
    if (isValidHex(inputValue)) {
      return expandHex(inputValue);
    }
    return value;
  }, [inputValue, value]);

  useEffect(() => {
    setInputValue(value);
    setInputInvalid(false);
  }, [value]);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(centerX, centerY) - 5;

      ctx.clearRect(0, 0, width, height);

      for (let angle = 0; angle < 360; angle += 1) {
        const startAngle = (angle - 1) * Math.PI / 180;
        const endAngle = (angle + 1) * Math.PI / 180;

        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, `hsl(${angle}, 100%, 100%)`);
        gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      const whiteGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      whiteGradient.addColorStop(0, 'rgba(255,255,255,1)');
      whiteGradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = whiteGradient;
      ctx.fillRect(0, 0, width, height);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowTooltip(false);
        if (inputValue && !isValidHex(inputValue)) {
          setInputValue(value);
          setInputInvalid(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue, value]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
    onChange(hex);
    setInputValue(hex);
    setInputInvalid(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;

    if (val && !val.startsWith('#')) {
      val = '#' + val;
    }

    setInputValue(val);

    if (val === '#' || val === '') {
      setInputInvalid(false);
      return;
    }

    if (isValidHex(val)) {
      setInputInvalid(false);
      const fullHex = expandHex(val);
      onChange(fullHex);
    } else if (/^#[0-9A-Fa-f]{0,6}$/.test(val) || /^#[0-9A-Fa-f]{0,3}$/.test(val)) {
      setInputInvalid(false);
    } else {
      setInputInvalid(true);
    }
  };

  const handleInputBlur = () => {
    if (inputValue && isValidHex(inputValue)) {
      const fullHex = expandHex(inputValue);
      setInputValue(fullHex);
      setInputInvalid(false);
    } else if (inputValue) {
      setInputInvalid(true);
    } else {
      setInputValue(value);
      setInputInvalid(false);
    }
  };

  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  };

  const handleEyeDropper = async () => {
    if (!eyeDropperSupported) return;
    try {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      if (result && result.sRGBHex) {
        onChange(result.sRGBHex);
        setInputValue(result.sRGBHex);
        setInputInvalid(false);
      }
    } catch (err) {
      console.warn('吸管工具操作失败:', err);
    }
  };

  const handleToggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
    setShowTooltip(false);
    if (!isOpen) {
      setInputInvalid(false);
    }
  }, [isOpen]);

  return (
    <div ref={pickerRef} style={{ position: 'relative', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, color: '#ccc', minWidth: 60 }}>{label}</span>
        <div
          onClick={handleToggleOpen}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: value,
            border: '2px solid ' + (inputInvalid ? '#ef4444' : '#555'),
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            transform: isOpen ? 'scale(1.1)' : 'scale(1)',
            boxShadow: inputInvalid ? '0 0 0 3px rgba(239,68,68,0.2)' : '0 2px 8px rgba(0,0,0,0.3)'
          }}
          title={isOpen ? '点击关闭' : '点击打开颜色选择器'}
        />
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          style={{
            flex: 1,
            height: 32,
            padding: '0 10px',
            borderRadius: 6,
            border: `1px solid ${inputInvalid ? '#ef4444' : '#444'}`,
            backgroundColor: '#2a2a3e',
            color: inputInvalid ? '#fca5a5' : '#fff',
            fontSize: 12,
            outline: 'none',
            fontFamily: 'monospace',
            textTransform: 'lowercase',
            transition: 'all 0.2s ease',
            boxShadow: inputInvalid ? '0 0 0 3px rgba(239,68,68,0.15)' : 'none'
          }}
          placeholder="#ffffff"
          maxLength={7}
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 8,
            zIndex: 100,
            padding: 14,
            backgroundColor: '#2a2a3e',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            animation: 'slideDown 0.2s ease-out',
            minWidth: 220
          }}
        >
          <style>{`
            @keyframes slideDown {
              from { opacity: 0; transform: translateY(-8px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <canvas
              ref={canvasRef}
              width={160}
              height={160}
              onClick={handleCanvasClick}
              style={{
                cursor: 'crosshair',
                borderRadius: '50%',
                display: 'block',
                flexShrink: 0
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              <span style={{ fontSize: 11, color: '#888' }}>当前颜色</span>
              <div
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 8,
                  backgroundColor: previewColor,
                  border: '1px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  transition: 'background-color 0.15s ease'
                }}
              />
              <div style={{
                fontSize: 10,
                color: '#aaa',
                fontFamily: 'monospace',
                textAlign: 'center',
                textTransform: 'lowercase'
              }}>
                {expandHex(previewColor)}
              </div>
            </div>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <button
              onClick={handleEyeDropper}
              disabled={!eyeDropperSupported}
              style={{
                flex: 1,
                height: 32,
                borderRadius: 6,
                border: '1px solid ' + (eyeDropperSupported ? '#444' : '#333'),
                backgroundColor: eyeDropperSupported ? '#3a3a4e' : '#2a2a3e',
                color: eyeDropperSupported ? '#fff' : '#666',
                fontSize: 12,
                cursor: eyeDropperSupported ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                opacity: eyeDropperSupported ? 1 : 0.6,
                transition: 'all 0.2s ease'
              }}
              title={eyeDropperSupported ? '从屏幕取色' : '当前浏览器不支持吸管工具'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 22l6-6m8.5-8.5l2.5 2.5M15.5 5.5l3 3L7.5 19.5 4.5 19.5 4.5 16.5 15.5 5.5z" />
              </svg>
              吸管工具
            </button>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowTooltip(!showTooltip)}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '1px solid #444',
                  backgroundColor: 'transparent',
                  color: '#888',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'help',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                aria-label="关于吸管工具"
              >
                ?
              </button>
              {showTooltip && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: 6,
                    padding: '8px 12px',
                    backgroundColor: '#1a1a2e',
                    color: '#ccc',
                    fontSize: 11,
                    lineHeight: 1.5,
                    borderRadius: 6,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 10,
                    animation: 'fadeIn 0.15s ease-out',
                    maxWidth: 200,
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#fff', marginBottom: 4 }}>
                    {eyeDropperSupported ? '✓ 已支持吸管工具' : '✕ 不支持吸管工具'}
                  </div>
                  <div>需要浏览器支持 EyeDropper API</div>
                  <div style={{ marginTop: 4, color: '#888' }}>
                    推荐使用 Chrome 或 Edge 浏览器
                  </div>
                </div>
              )}
            </div>
          </div>

          {!eyeDropperSupported && (
            <div style={{
              marginTop: 10,
              padding: '6px 10px',
              backgroundColor: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 6,
              fontSize: 11,
              color: '#fca5a5',
              lineHeight: 1.4
            }}>
              当前浏览器不支持吸管工具
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
