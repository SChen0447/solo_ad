import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { useColorStore } from '../store/colorStore';
import { hslToHex, getContrastColor } from '../utils/colorUtils';
import type { HSL } from '../types';

interface RingConfig {
  radius: number;
  width: number;
  type: 'hue' | 'saturation' | 'lightness';
}

const ColorWheel: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [size, setSize] = useState(480);
  const rafRef = useRef<number | null>(null);
  const pendingUpdateRef = useRef<HSL | null>(null);

  const primaryColor = useColorStore(state => state.primaryColor);
  const setPrimaryColor = useColorStore(state => state.setPrimaryColor);
  const randomPreset = useColorStore(state => state.randomPreset);

  const rings: RingConfig[] = [
    { radius: 200, width: 28, type: 'hue' },
    { radius: 156, width: 28, type: 'saturation' },
    { radius: 112, width: 28, type: 'lightness' },
  ];

  const centerX = size / 2;
  const centerY = size / 2;

  const getValueFromAngle = useCallback((angle: number, type: string): number => {
    const normalized = ((angle % 360) + 360) % 360;
    if (type === 'hue') return Math.round(normalized);
    if (type === 'saturation') return Math.round((normalized / 360) * 100);
    if (type === 'lightness') return Math.round((normalized / 360) * 100);
    return 0;
  }, []);

  const getAngleFromValue = useCallback((value: number, type: string): number => {
    if (type === 'hue') return value;
    if (type === 'saturation' || type === 'lightness') return (value / 100) * 360;
    return 0;
  }, []);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, size, size);

    rings.forEach((ring) => {
      const innerRadius = ring.radius - ring.width / 2;
      const outerRadius = ring.radius + ring.width / 2;

      for (let angle = 0; angle < 360; angle += 0.5) {
        const startAngle = (angle - 90) * Math.PI / 180;
        const endAngle = (angle + 0.5 - 90) * Math.PI / 180;

        let color: string;
        if (ring.type === 'hue') {
          color = hslToHex(angle, primaryColor.s, primaryColor.l);
        } else if (ring.type === 'saturation') {
          const s = Math.round((angle / 360) * 100);
          color = hslToHex(primaryColor.h, s, primaryColor.l);
        } else {
          const l = Math.round((angle / 360) * 100);
          color = hslToHex(primaryColor.h, primaryColor.s, l);
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
        ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      }

      const value = ring.type === 'hue' ? primaryColor.h
        : ring.type === 'saturation' ? primaryColor.s
        : primaryColor.l;
      const handleAngle = getAngleFromValue(value, ring.type);
      const handleRad = (handleAngle - 90) * Math.PI / 180;
      const handleX = centerX + Math.cos(handleRad) * ring.radius;
      const handleY = centerY + Math.sin(handleRad) * ring.radius;

      const handleColor = ring.type === 'hue'
        ? hslToHex(primaryColor.h, primaryColor.s, primaryColor.l)
        : ring.type === 'saturation'
        ? hslToHex(primaryColor.h, value, primaryColor.l)
        : hslToHex(primaryColor.h, primaryColor.s, value);

      ctx.beginPath();
      ctx.arc(handleX, handleY, 12, 0, Math.PI * 2);
      ctx.fillStyle = handleColor;
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(handleX, handleY, 18, 0, Math.PI * 2);
      ctx.strokeStyle = `${handleColor}40`;
      ctx.lineWidth = 6;
      ctx.stroke();
    });

    const innerRadius = rings[2].radius - rings[2].width / 2 - 20;
    const centerColor = hslToHex(primaryColor.h, primaryColor.s, primaryColor.l);
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, innerRadius);
    gradient.addColorStop(0, centerColor);
    gradient.addColorStop(1, `${centerColor}CC`);

    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }, [size, primaryColor, rings, centerX, centerY, getAngleFromValue]);

  useEffect(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(drawWheel);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [drawWheel]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setSize(320);
      } else if (width < 1024) {
        setSize(400);
      } else {
        setSize(480);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getRingAtPosition = useCallback((x: number, y: number): RingConfig | null => {
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    for (const ring of rings) {
      const inner = ring.radius - ring.width / 2 - 10;
      const outer = ring.radius + ring.width / 2 + 10;
      if (distance >= inner && distance <= outer) {
        return ring;
      }
    }
    return null;
  }, [centerX, centerY, rings]);

  const getAngleFromPosition = useCallback((x: number, y: number): number => {
    const dx = x - centerX;
    const dy = y - centerY;
    let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    return ((angle % 360) + 360) % 360;
  }, [centerX, centerY]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ring = getRingAtPosition(x, y);
    if (ring) {
      setIsDragging(ring.type);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const angle = getAngleFromPosition(x, y);
      const value = getValueFromAngle(angle, ring.type);
      const newColor: HSL = { ...primaryColor };

      if (ring.type === 'hue') newColor.h = value;
      else if (ring.type === 'saturation') newColor.s = value;
      else newColor.l = value;

      pendingUpdateRef.current = newColor;
      setPrimaryColor(newColor);
    }
  }, [getRingAtPosition, getAngleFromPosition, getValueFromAngle, primaryColor, setPrimaryColor]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const angle = getAngleFromPosition(x, y);
    const value = getValueFromAngle(angle, isDragging);
    const newColor: HSL = { ...primaryColor };

    if (isDragging === 'hue') newColor.h = value;
    else if (isDragging === 'saturation') newColor.s = value;
    else newColor.l = value;

    if (pendingUpdateRef.current &&
        pendingUpdateRef.current.h === newColor.h &&
        pendingUpdateRef.current.s === newColor.s &&
        pendingUpdateRef.current.l === newColor.l) {
      return;
    }

    pendingUpdateRef.current = newColor;
    setPrimaryColor(newColor);
  }, [isDragging, getAngleFromPosition, getValueFromAngle, primaryColor, setPrimaryColor]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(null);
    pendingUpdateRef.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  const primaryHex = hslToHex(primaryColor.h, primaryColor.s, primaryColor.l);
  const contrastColor = getContrastColor(primaryHex);

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-12 px-4 py-8">
      <div ref={containerRef} className="relative">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="cursor-pointer touch-none"
          style={{ touchAction: 'none' }}
        />

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="rounded-full flex flex-col items-center justify-center"
            style={{
              width: `${(rings[2].radius - rings[2].width / 2 - 40) * 2 * (size / 480)}px`,
              height: `${(rings[2].radius - rings[2].width / 2 - 40) * 2 * (size / 480)}px`,
              backgroundColor: primaryHex,
              color: contrastColor,
              boxShadow: `0 8px 32px ${primaryHex}40`,
            }}
          >
            <span className="font-mono text-sm font-bold tracking-wider">{primaryHex}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div
          className="w-48 h-48 rounded-2xl shadow-2xl transition-all duration-300"
          style={{
            backgroundColor: primaryHex,
            boxShadow: `0 20px 60px ${primaryHex}40`,
          }}
        />

        <div className="flex flex-col gap-3 w-full">
          <div className="flex justify-between items-center px-2">
            <span className="text-gray-500 text-sm font-medium">色相 H</span>
            <span className="font-mono text-gray-800 text-sm w-12 text-right">{primaryColor.h}°</span>
          </div>
          <div className="flex justify-between items-center px-2">
            <span className="text-gray-500 text-sm font-medium">饱和度 S</span>
            <span className="font-mono text-gray-800 text-sm w-12 text-right">{primaryColor.s}%</span>
          </div>
          <div className="flex justify-between items-center px-2">
            <span className="text-gray-500 text-sm font-medium">明度 L</span>
            <span className="font-mono text-gray-800 text-sm w-12 text-right">{primaryColor.l}%</span>
          </div>
        </div>

        <button
          onClick={randomPreset}
          className="flex items-center gap-2 px-6 py-3 rounded-full backdrop-blur-xl bg-white/60 border border-gray-200/50 text-gray-700 font-medium hover:bg-white/80 hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg"
        >
          <Shuffle size={18} />
          <span>随机配色</span>
        </button>
      </div>
    </div>
  );
};

export default ColorWheel;
