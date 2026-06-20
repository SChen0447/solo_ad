import React, { useRef, useEffect, useState, useCallback } from 'react';

interface HueCanvasPickerProps {
  hue: number;
  saturation?: number;
  lightness?: number;
  onChange: (hue: number) => void;
}

const HueCanvasPicker: React.FC<HueCanvasPickerProps> = ({
  hue,
  saturation = 80,
  lightness = 50,
  onChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dprRef = useRef<number>(1);
  const [isDragging, setIsDragging] = useState(false);
  const [displayHue, setDisplayHue] = useState(hue);

  const outerRadius = 110;
  const innerRadius = 85;
  const displaySize = outerRadius * 2 + 20;
  const centerX = displaySize / 2;
  const centerY = displaySize / 2;

  const drawHueRing = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = dprRef.current;
    const scaledSize = displaySize * dpr;
    const scaledOuter = outerRadius * dpr;
    const scaledInner = innerRadius * dpr;
    const scaledCenterX = centerX * dpr;
    const scaledCenterY = centerY * dpr;
    const scaledIndicatorOuter = 14 * dpr;
    const scaledIndicatorInner = 8 * dpr;
    const scaledLineWidth = 3 * dpr;

    if (canvas.width !== scaledSize || canvas.height !== scaledSize) {
      canvas.width = scaledSize;
      canvas.height = scaledSize;
    }

    ctx.clearRect(0, 0, scaledSize, scaledSize);
    ctx.save();

    for (let angle = 0; angle < 360; angle++) {
      const startAngle = ((angle - 0.5) * Math.PI) / 180;
      const endAngle = ((angle + 0.5) * Math.PI) / 180;

      ctx.beginPath();
      ctx.arc(scaledCenterX, scaledCenterY, scaledOuter, startAngle, endAngle);
      ctx.arc(scaledCenterX, scaledCenterY, scaledInner, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = `hsl(${angle}, ${saturation}%, ${lightness}%)`;
      ctx.fill();
    }

    const indicatorAngle = ((displayHue - 90) * Math.PI) / 180;
    const indicatorRadius = (scaledOuter + scaledInner) / 2;
    const indicatorX = scaledCenterX + Math.cos(indicatorAngle) * indicatorRadius;
    const indicatorY = scaledCenterY + Math.sin(indicatorAngle) * indicatorRadius;

    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, scaledIndicatorOuter, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.lineWidth = scaledLineWidth;
    ctx.strokeStyle = `hsl(${displayHue}, ${saturation}%, ${lightness}%)`;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, scaledIndicatorInner, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${displayHue}, ${saturation}%, ${lightness}%)`;
    ctx.fill();

    ctx.restore();
  }, [displayHue, saturation, lightness, displaySize, outerRadius, innerRadius, centerX, centerY]);

  useEffect(() => {
    dprRef.current = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  }, []);

  useEffect(() => {
    drawHueRing();
  }, [drawHueRing]);

  useEffect(() => {
    if (!isDragging) {
      setDisplayHue(hue);
    }
  }, [hue, isDragging]);

  const getHueFromPosition = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return displayHue;

      const rect = canvas.getBoundingClientRect();
      const scaleX = displaySize / rect.width;
      const scaleY = displaySize / rect.height;
      const x = (clientX - rect.left) * scaleX - centerX;
      const y = (clientY - rect.top) * scaleY - centerY;

      let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;
      if (angle >= 360) angle -= 360;

      return Math.round(angle);
    },
    [centerX, centerY, displaySize, displayHue]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      setIsDragging(true);
      const newHue = getHueFromPosition(e.clientX, e.clientY);
      setDisplayHue(newHue);
      onChange(newHue);
    },
    [getHueFromPosition, onChange]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const newHue = getHueFromPosition(e.clientX, e.clientY);
      setDisplayHue(newHue);
      onChange(newHue);
    },
    [isDragging, getHueFromPosition, onChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      setIsDragging(true);
      const touch = e.touches[0];
      const newHue = getHueFromPosition(touch.clientX, touch.clientY);
      setDisplayHue(newHue);
      onChange(newHue);
    },
    [getHueFromPosition, onChange]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      const newHue = getHueFromPosition(touch.clientX, touch.clientY);
      setDisplayHue(newHue);
      onChange(newHue);
    },
    [isDragging, getHueFromPosition, onChange]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div className="hue-canvas-picker">
      <div className="hue-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="hue-canvas"
          style={{
            width: `${displaySize}px`,
            height: `${displaySize}px`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        />
        <div className="hue-center-display">
          <span className="hue-value">{displayHue}°</span>
          <span className="hue-label">HUE</span>
          <span
            className="hue-preview"
            style={{ backgroundColor: `hsl(${displayHue}, ${saturation}%, ${lightness}%)` }}
          />
        </div>
      </div>
    </div>
  );
};

export default HueCanvasPicker;
