import React, { useState, useRef, useEffect } from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const pickerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setInputValue(value);
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
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      onChange(val);
    }
  };

  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  };

  const handleEyeDropper = async () => {
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        onChange(result.sRGBHex);
        setInputValue(result.sRGBHex);
      } catch {
      }
    } else {
      alert('您的浏览器不支持吸管工具，请使用Chrome或Edge浏览器。');
    }
  };

  return (
    <div ref={pickerRef} style={{ position: 'relative', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, color: '#ccc', minWidth: 60 }}>{label}</span>
        <div
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: value,
            border: '2px solid #555',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            transform: isOpen ? 'scale(1.1)' : 'scale(1)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        />
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          style={{
            flex: 1,
            height: 32,
            padding: '0 10px',
            borderRadius: 6,
            border: '1px solid #444',
            backgroundColor: '#2a2a3e',
            color: '#fff',
            fontSize: 12,
            outline: 'none',
            fontFamily: 'monospace'
          }}
          placeholder="#FFFFFF"
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
            padding: 12,
            backgroundColor: '#2a2a3e',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            animation: 'slideDown 0.2s ease-out'
          }}
        >
          <style>{`
            @keyframes slideDown {
              from { opacity: 0; transform: translateY(-8px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <canvas
            ref={canvasRef}
            width={180}
            height={180}
            onClick={handleCanvasClick}
            style={{
              cursor: 'crosshair',
              borderRadius: '50%',
              display: 'block'
            }}
          />
          <button
            onClick={handleEyeDropper}
            style={{
              marginTop: 10,
              width: '100%',
              height: 32,
              borderRadius: 6,
              border: '1px solid #444',
              backgroundColor: '#3a3a4e',
              color: '#fff',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 22l6-6m8.5-8.5l2.5 2.5M15.5 5.5l3 3L7.5 19.5 4.5 19.5 4.5 16.5 15.5 5.5z" />
            </svg>
            吸管工具
          </button>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
