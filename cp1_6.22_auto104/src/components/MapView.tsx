import React, { useRef, useEffect, useCallback } from 'react';
import type { CatPoint } from '../types';

interface MapViewProps {
  catPoints: CatPoint[];
  onSelectPoint: (point: CatPoint) => void;
}

interface BuildingRect {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

const PAW_COLOR = '#ed8936';
const PINK = '#f687b3';

function drawCatPaw(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number
) {
  const r = size * 0.3;
  ctx.fillStyle = PAW_COLOR;

  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.6, r * 1.1, r * 1.3, 0, 0, Math.PI * 2);
  ctx.fill();

  const pads = [
    { dx: -r * 0.85, dy: -r * 0.7, pr: r * 0.48 },
    { dx: -r * 0.3, dy: -r * 1.25, pr: r * 0.42 },
    { dx: r * 0.3, dy: -r * 1.25, pr: r * 0.42 },
    { dx: r * 0.85, dy: -r * 0.7, pr: r * 0.48 },
  ];
  for (const p of pads) {
    ctx.beginPath();
    ctx.arc(cx + p.dx, cy + p.dy, p.pr, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRedDot(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const dotR = size * 0.22;
  ctx.fillStyle = '#e53e3e';
  ctx.beginPath();
  ctx.arc(cx + size * 0.7, cy - size * 0.7, dotR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export default function MapView({ catPoints, onSelectPoint }: MapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const hoverRef = useRef<string | null>(null);
  const buildingsRef = useRef<BuildingRect[]>([]);
  const timeRef = useRef(0);

  const getPointScreenPos = useCallback(
    (point: CatPoint, w: number, h: number) => ({
      sx: point.x * w,
      sy: point.y * h,
    }),
    []
  );

  const generateBuildings = useCallback((w: number, h: number) => {
    const buildings: BuildingRect[] = [];
    const colors = ['#fde8d0', '#fbd5c8', '#fce4c3', '#e8ddd3', '#f5e6d3', '#f0ddd0'];
    for (let i = 0; i < 18; i++) {
      buildings.push({
        x: Math.random() * w * 0.9 + w * 0.05,
        y: Math.random() * h * 0.9 + h * 0.05,
        w: 40 + Math.random() * 80,
        h: 30 + Math.random() * 60,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    buildingsRef.current = buildings;
  }, []);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => {
      ctx.clearRect(0, 0, w, h);

      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, '#fef9f0');
      bgGrad.addColorStop(1, '#fdebd0');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      for (const b of buildingsRef.current) {
        ctx.fillStyle = b.color;
        ctx.strokeStyle = '#d4c5b5';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 4);
        ctx.fill();
        ctx.stroke();
      }

      ctx.strokeStyle = '#c9b99a';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      ctx.lineTo(w, h * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.5, 0);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#d4c5b5';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.25);
      ctx.lineTo(w, h * 0.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, h * 0.75);
      ctx.lineTo(w, h * 0.75);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.25, 0);
      ctx.lineTo(w * 0.25, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.75, 0);
      ctx.lineTo(w * 0.75, h);
      ctx.stroke();

      for (const point of catPoints) {
        const { sx, sy } = getPointScreenPos(point, w, h);
        const isHover = hoverRef.current === point.id;
        const pawSize = isHover ? 24 : 18;
        const bounce = Math.sin(time * 0.003 + point.x * 10) * 2;

        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;
        drawCatPaw(ctx, sx, sy + bounce, pawSize);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        if (point.hasNewUpdate) {
          drawRedDot(ctx, sx, sy + bounce, pawSize);
        }

        ctx.fillStyle = isHover ? '#c05621' : '#744210';
        ctx.font = `bold ${isHover ? 14 : 12}px "PingFang SC", "Microsoft YaHei", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(point.name, sx, sy + pawSize * 1.2 + bounce + 16);

        if (isHover) {
          ctx.strokeStyle = PINK;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(sx, sy + bounce, pawSize * 1.8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      ctx.fillStyle = '#9b7e65';
      ctx.font = 'italic 13px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('🐾 街角喵声地图', w - 16, h - 12);
    },
    [catPoints, getPointScreenPos]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(800, rect.width);
      const h = Math.max(500, w * 0.56);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      generateBuildings(w, h);
    };

    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = (ts: number) => {
      timeRef.current = ts;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      draw(ctx, w, h, ts);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw, generateBuildings]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      for (const point of catPoints) {
        const { sx, sy } = getPointScreenPos(point, w, h);
        const dist = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2);
        if (dist < 30) {
          onSelectPoint(point);
          return;
        }
      }
    },
    [catPoints, getPointScreenPos, onSelectPoint]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      let found: string | null = null;
      for (const point of catPoints) {
        const { sx, sy } = getPointScreenPos(point, w, h);
        const dist = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2);
        if (dist < 30) {
          found = point.id;
          break;
        }
      }
      hoverRef.current = found;
      canvas.style.cursor = found ? 'pointer' : 'default';
    },
    [catPoints, getPointScreenPos]
  );

  return (
    <div ref={containerRef} style={{ width: '100%', minWidth: 800, overflow: 'auto' }}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        style={{ display: 'block', borderRadius: 12 }}
      />
    </div>
  );
}
