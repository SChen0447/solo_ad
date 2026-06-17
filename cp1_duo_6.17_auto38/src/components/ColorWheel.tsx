import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ColorWheelProps {
  hue: number;
  saturation: number;
  lightness: number;
  onChange: (hue: number, saturation: number, lightness: number) => void;
}

export const ColorWheel: React.FC<ColorWheelProps> = ({
  hue,
  saturation,
  lightness,
  onChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const wheelRef = useRef<HTMLCanvasElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [isDraggingWheel, setIsDraggingWheel] = useState(false);
  const [isDraggingLightness, setIsDraggingLightness] = useState(false);

  const size = 160;

  const drawWheel = useCallback(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 5;

    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = ((angle - 1) * Math.PI) / 180;
      const endAngle = ((angle + 1) * Math.PI) / 180;

      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        radius
      );

      const hslCenter = `hsl(${angle}, 0%, ${lightness}%)`;
      const hslEdge = `hsl(${angle}, 100%, ${lightness}%)`;

      gradient.addColorStop(0, hslCenter);
      gradient.addColorStop(1, hslEdge);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    const hueRad = (hue * Math.PI) / 180;
    const satRadius = (saturation / 100) * radius;
    const markerX = centerX + Math.cos(hueRad) * satRadius;
    const markerY = centerY + Math.sin(hueRad) * satRadius;

    ctx.beginPath();
    ctx.arc(markerX, markerY, 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(markerX, markerY, 4, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    ctx.fill();
  }, [hue, saturation, lightness, size]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  const handleWheelClick = useCallback(
    (e: React.MouseEvent) => {
      const canvas = wheelRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size / 2 - 5;

      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= radius) {
        let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (angle < 0) angle += 360;
        const sat = Math.min((distance / radius) * 100, 100);
        onChange(angle, sat, lightness);
      }
    },
    [size, lightness, onChange]
  );

  const handleWheelMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDraggingWheel(true);
      handleWheelClick(e);
    },
    [handleWheelClick]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingWheel) return;

      const canvas = wheelRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size / 2 - 5;

      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angle < 0) angle += 360;
      const sat = Math.min(Math.max((distance / radius) * 100, 0), 100);
      onChange(angle, sat, lightness);
    },
    [isDraggingWheel, size, lightness, onChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingWheel(false);
    setIsDraggingLightness(false);
  }, []);

  useEffect(() => {
    if (isDraggingWheel || isDraggingLightness) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingWheel, isDraggingLightness, handleMouseMove, handleMouseUp]);

  const handleLightnessMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDraggingLightness(true);
      updateLightness(e);
    },
    []
  );

  const updateLightness = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      const bar = pickerRef.current;
      if (!bar) return;

      const rect = bar.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;
      const newLightness = Math.max(0, Math.min(100, 100 - (y / height) * 100));
      onChange(hue, saturation, newLightness);
    },
    [hue, saturation, onChange]
  );

  const currentColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: currentColor,
          cursor: 'pointer',
          border: '3px solid rgba(255,255,255,0.8)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        }}
      />

      {isExpanded && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 12,
            background: 'rgba(255, 252, 245, 0.9)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: 16,
            padding: 16,
            boxShadow: '0 8px 32px rgba(93, 78, 55, 0.15)',
            border: '1px solid rgba(139, 115, 85, 0.2)',
            display: 'flex',
            gap: 12,
            zIndex: 1000,
            animation: 'expandOut 0.2s ease-out',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <canvas
            ref={wheelRef}
            width={size}
            height={size}
            onMouseDown={handleWheelMouseDown}
            style={{
              cursor: 'crosshair',
              borderRadius: '50%',
            }}
          />

          <div
            ref={pickerRef}
            onMouseDown={handleLightnessMouseDown}
            style={{
              width: 20,
              height: size,
              borderRadius: 10,
              background: `linear-gradient(to top, hsl(${hue}, ${saturation}%, 0%), hsl(${hue}, ${saturation}%, 50%), hsl(${hue}, ${saturation}%, 100%))`,
              cursor: 'ns-resize',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: `${100 - lightness}%`,
                left: -4,
                right: -4,
                height: 4,
                background: '#fff',
                borderRadius: 2,
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                transform: 'translateY(-50%)',
              }}
            />
          </div>

          <style>{`
            @keyframes expandOut {
              from { opacity: 0; transform: translateY(-10px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};
