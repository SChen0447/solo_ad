import { useRef, useEffect, useState, useCallback } from 'react';
import { HSL, hslToString, hslToHex } from './colorTheory';

interface ColorWheelProps {
  baseColor: HSL;
  harmonyColors: HSL[];
  onBaseColorChange: (color: HSL) => void;
}

interface Marker {
  angle: number;
  color: HSL;
  isBase: boolean;
}

export default function ColorWheel({ baseColor, harmonyColors, onBaseColorChange }: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const [size, setSize] = useState<number>(320);

  const getMarkers = useCallback((): Marker[] => {
    return harmonyColors.map((color, _idx) => ({
      angle: (color.h - 90) * Math.PI / 180,
      color,
      isBase: Math.abs(color.h - baseColor.h) < 1 && color.s === baseColor.s && color.l === baseColor.l
    }));
  }, [harmonyColors, baseColor]);

  const drawWheel = useCallback((ctx: CanvasRenderingContext2D, s: number) => {
    const centerX = s / 2;
    const centerY = s / 2;
    const outerRadius = s / 2 - 20;
    const innerRadius = outerRadius * 0.55;
    const segments = 360;

    ctx.clearRect(0, 0, s, s);

    for (let i = 0; i < segments; i++) {
      const startAngle = (i - 0.5) * Math.PI / 180;
      const endAngle = (i + 1.5) * Math.PI / 180;
      const hue = i;

      const gradient = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, outerRadius);
      gradient.addColorStop(0, hslToString({ h: hue, s: 100, l: 60 }));
      gradient.addColorStop(1, hslToString({ h: hue, s: 100, l: 40 }));

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    const innerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, innerRadius);
    innerGradient.addColorStop(0, '#1a1a2e');
    innerGradient.addColorStop(0.7, hslToString(baseColor));
    innerGradient.addColorStop(1, hslToString({ ...baseColor, l: Math.max(20, baseColor.l - 20) }));

    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius - 2, 0, Math.PI * 2);
    ctx.fillStyle = innerGradient;
    ctx.fill();

    const markers = getMarkers();
    const time = timeRef.current;

    markers.forEach((marker, index) => {
      const breathe = 0.7 + 0.3 * Math.sin(time * 0.003 + index * 0.5);
      const markerRadius = outerRadius * 0.82;
      const x = centerX + Math.cos(marker.angle) * markerRadius;
      const y = centerY + Math.sin(marker.angle) * markerRadius;

      const glowRadius = (marker.isBase ? 24 : 18) * breathe;
      const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
      const glowColor = hslToString({ ...marker.color, l: 60 });
      glowGradient.addColorStop(0, glowColor.replace(')', ', 0.6)').replace('hsl', 'hsla'));
      glowGradient.addColorStop(1, glowColor.replace(')', ', 0)').replace('hsl', 'hsla'));

      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, marker.isBase ? 10 : 8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, marker.isBase ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = hslToHex(marker.color);
      ctx.fill();
    });

    const hexLabel = hslToHex(baseColor);
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = baseColor.l > 50 ? '#1a1a2e' : '#ffffff';
    ctx.fillText(hexLabel, centerX, centerY + 6);
  }, [baseColor, getMarkers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const newSize = Math.min(Math.max(rect.width, 280), 420);
      setSize(newSize);
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const animate = (timestamp: number) => {
      timeRef.current = timestamp;
      drawWheel(ctx, size);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [size, drawWheel]);

  const getHSLFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent): HSL | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const centerX = size / 2;
    const centerY = size / 2;
    const x = e.clientX - rect.left - centerX;
    const y = e.clientY - rect.top - centerY;
    const distance = Math.sqrt(x * x + y * y);
    const outerRadius = size / 2 - 20;
    const innerRadius = outerRadius * 0.55;

    if (distance < innerRadius || distance > outerRadius) return null;

    let angle = Math.atan2(y, x) * 180 / Math.PI + 90;
    if (angle < 0) angle += 360;

    const saturation = 100;
    const lightness = 50;

    return { h: Math.round(angle), s: saturation, l: lightness };
  }, [size]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    const color = getHSLFromEvent(e);
    if (color) onBaseColorChange(color);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const color = getHSLFromEvent(e);
      if (color) onBaseColorChange(color);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [getHSLFromEvent, onBaseColorChange]);

  return (
    <div ref={containerRef} className="color-wheel-container">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        style={{ cursor: 'crosshair' }}
      />
    </div>
  );
}
