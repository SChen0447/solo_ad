import React, { useState, useRef, useEffect, useCallback } from 'react';
import { hslToHex, hexToHsl } from '../theme-engine/colorUtils';
import type { HSL } from '../theme-engine/colorUtils';
import './ColorPicker.css';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hsl, setHsl] = useState<HSL>(hexToHsl(color));
  const [showFlash, setShowFlash] = useState(false);
  const [isWheelDragging, setIsWheelDragging] = useState(false);
  const [isBrightnessDragging, setIsBrightnessDragging] = useState(false);
  const [selectorPulse, setSelectorPulse] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const isDraggingBrightness = useRef(false);

  useEffect(() => {
    setHsl(hexToHsl(color));
  }, [color]);

  useEffect(() => {
    if (isOpen) {
      setHsl(hexToHsl(color));
    }
  }, [isOpen, color]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getColorFromPosition = useCallback((clientX: number, clientY: number) => {
    if (!wheelRef.current) return null;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = clientX - rect.left - centerX;
    const y = clientY - rect.top - centerY;

    const radius = Math.min(centerX, centerY);
    const distance = Math.sqrt(x * x + y * y);
    const saturation = Math.min(100, (distance / radius) * 100);

    let angle = Math.atan2(y, x) * (180 / Math.PI);
    angle = (angle + 360) % 360;

    return { h: angle, s: saturation, l: hsl.l };
  }, [hsl.l]);

  const handleWheelMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    setIsWheelDragging(true);
    updateColor(e.clientX, e.clientY);
  };

  const updateColor = useCallback((clientX: number, clientY: number) => {
    const newHsl = getColorFromPosition(clientX, clientY);
    if (newHsl) {
      setHsl(newHsl);
      onChange(hslToHex(newHsl));
    }
  }, [getColorFromPosition, onChange]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        updateColor(e.clientX, e.clientY);
      }
    };
    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        setIsWheelDragging(false);
        triggerPulse();
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [updateColor]);

  const triggerFlash = () => {
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 300);
  };

  const triggerPulse = () => {
    setSelectorPulse(true);
    setTimeout(() => setSelectorPulse(false), 400);
  };

  const handleBrightnessMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingBrightness.current = true;
    setIsBrightnessDragging(true);
    updateBrightness(e);
  };

  const updateBrightness = (e: MouseEvent | React.MouseEvent) => {
    if (!pickerRef.current) return;
    const bar = pickerRef.current.querySelector('.brightness-bar') as HTMLElement;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const y = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (y / rect.width) * 100));
    const newHsl = { ...hsl, l: percent };
    setHsl(newHsl);
    onChange(hslToHex(newHsl));
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingBrightness.current) {
        updateBrightness(e);
      }
    };
    const handleMouseUp = () => {
      if (isDraggingBrightness.current) {
        isDraggingBrightness.current = false;
        setIsBrightnessDragging(false);
        triggerPulse();
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [hsl]);

  const handleToggle = () => {
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const wheelSize = 160;
  const centerX = wheelSize / 2;
  const centerY = wheelSize / 2;
  const radius = (wheelSize / 2) * (hsl.s / 100);
  const angleRad = (hsl.h * Math.PI) / 180;
  const selectorX = centerX + radius * Math.cos(angleRad);
  const selectorY = centerY + radius * Math.sin(angleRad);

  return (
    <div className="color-picker-wrapper" ref={pickerRef}>
      <div className="color-picker-label">{label}</div>
      <div
        className="color-picker-trigger"
        onClick={handleToggle}
        style={{ backgroundColor: color }}
      />
      {isOpen && (
        <div className="color-picker-popup">
          <div
            ref={wheelRef}
            className={`color-wheel ${isWheelDragging ? 'dragging' : ''}`}
            style={{ width: wheelSize, height: wheelSize }}
            onMouseDown={handleWheelMouseDown}
          >
            <div className="color-wheel-gradient" />
            <div className="color-wheel-center-white" />
            <div
              className={`color-selector ${isWheelDragging ? 'dragging' : ''} ${selectorPulse ? 'pulse' : ''}`}
              style={{
                left: selectorX - 8,
                top: selectorY - 8,
                backgroundColor: hslToHex({ h: hsl.h, s: hsl.s, l: 50 })
              }}
            />
          </div>
          <div
            className={`brightness-bar ${isBrightnessDragging ? 'dragging' : ''}`}
            onMouseDown={handleBrightnessMouseDown}
          >
            <div
              className="brightness-bar-bg"
              style={{
                background: `linear-gradient(to right, #000, hsl(${hsl.h}, ${hsl.s}%, 50%), #fff)`
              }}
            />
            <div
              className={`brightness-thumb ${isBrightnessDragging ? 'glow' : ''}`}
              style={{ left: `calc(${hsl.l}% - 6px)` }}
            />
          </div>
          <div className="color-value-display">
            <span style={{ backgroundColor: color }} />
            <input
              type="text"
              value={color}
              onChange={(e) => {
                const val = e.target.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                  onChange(val);
                }
              }}
              className="color-hex-input"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
