import { useState, useRef, useEffect, useCallback } from 'react';
import type { HSV, RGB } from '../types';
import { hsvToRgb, rgbToHex, hexToRgb, rgbToHsv } from '../utils/colorUtils';

interface ColorPickerProps {
  color: string;
  onChange: (hex: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
}

export default function ColorPicker({
  color,
  onChange,
  onClose,
  anchorRef,
}: ColorPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [hsv, setHsv] = useState<HSV>(() => {
    const rgb = hexToRgb(color);
    return rgbToHsv(rgb.r, rgb.g, rgb.b);
  });
  const [isDraggingSaturation, setIsDraggingSaturation] = useState(false);
  const [isDraggingHue, setIsDraggingHue] = useState(false);
  const [isDraggingValue, setIsDraggingValue] = useState(false);
  const satRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const valRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current && pickerRef.current) {
      const anchor = anchorRef.current.getBoundingClientRect();
      const picker = pickerRef.current.getBoundingClientRect();
      setPos({
        top: anchor.bottom + 12 + window.scrollY,
        left: Math.max(
          8,
          Math.min(
            window.innerWidth - picker.width - 8,
            anchor.left + anchor.width / 2 - picker.width / 2 + window.scrollX,
          ),
        ),
      });
    }
  }, [anchorRef]);

  useEffect(() => {
    const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    onChange(hex);
  }, [hsv, onChange]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorRef]);

  const updateFromSaturation = useCallback(
    (clientX: number, clientY: number) => {
      if (!satRef.current) return;
      const rect = satRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      setHsv((prev) => ({
        ...prev,
        s: Math.round(x * 100),
        v: Math.round((1 - y) * 100),
      }));
    },
    [],
  );

  const updateFromHue = useCallback((clientX: number) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setHsv((prev) => ({ ...prev, h: Math.round(x * 360) }));
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSaturation) updateFromSaturation(e.clientX, e.clientY);
      if (isDraggingHue) updateFromHue(e.clientX);
    };
    const handleMouseUp = () => {
      setIsDraggingSaturation(false);
      setIsDraggingHue(false);
      setIsDraggingValue(false);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSaturation, isDraggingHue, updateFromSaturation, updateFromHue]);

  const hueColor = `hsl(${hsv.h}, 100%, 50%)`;
  const pureHueRgb = hsvToRgb(hsv.h, 100, 100);
  const currentHex = rgbToHex(pureHueRgb.r, pureHueRgb.g, pureHueRgb.b);

  const satPosX = `${hsv.s}%`;
  const satPosY = `${100 - hsv.v}%`;
  const huePos = `${(hsv.h / 360) * 100}%`;

  return (
    <div
      ref={pickerRef}
      style={{
        position: 'absolute',
        top: pos.top,
        left: pos.left,
        zIndex: 1000,
        background: '#1e1e1e',
        border: '1px solid #333',
        borderRadius: '12px',
        padding: '16px',
        width: '260px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        animation: 'fadeInScale 0.2s ease-out',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -8,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderBottom: '8px solid #1e1e1e',
          filter: 'drop-shadow(0 -1px 0 #333)',
        }}
      />

      <div
        ref={satRef}
        onMouseDown={(e) => {
          setIsDraggingSaturation(true);
          updateFromSaturation(e.clientX, e.clientY);
        }}
        style={{
          position: 'relative',
          width: '100%',
          height: '160px',
          borderRadius: '8px',
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
          cursor: 'crosshair',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: satPosX,
            top: satPosY,
            width: '16px',
            height: '16px',
            border: '2px solid #fff',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
          }}
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div
          ref={hueRef}
          onMouseDown={(e) => {
            setIsDraggingHue(true);
            updateFromHue(e.clientX);
          }}
          style={{
            position: 'relative',
            height: '14px',
            borderRadius: '7px',
            background:
              'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: huePos,
              top: '50%',
              width: '18px',
              height: '18px',
              border: '2px solid #fff',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
              pointerEvents: 'none',
              background: hueColor,
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            background: currentHex,
            border: '1px solid #444',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#9e9e9e', marginBottom: '4px' }}>
            HEX / RGB
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#e0e0e0' }}>
            {currentHex}
          </div>
          <div style={{ fontSize: '11px', color: '#9e9e9e', marginTop: '2px' }}>
            HSV: {hsv.h}° {hsv.s}% {hsv.v}%
          </div>
        </div>
      </div>
    </div>
  );
}
