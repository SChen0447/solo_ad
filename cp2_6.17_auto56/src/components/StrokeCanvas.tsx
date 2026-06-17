import { useEffect, useRef } from 'react';
import type { Stroke } from '../data/hanziData';

interface StrokeCanvasProps {
  strokes: Stroke[];
  currentStrokeIndex: number;
  strokeProgress: number;
}

const CANVAS_SIZE = 500;
const SCALE = CANVAS_SIZE / 100;

function generatePaperTexture(width: number, height: number): HTMLCanvasElement {
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d')!;

  ctx.fillStyle = '#f5e6c8';
  ctx.fillRect(0, 0, width, height);

  const fiberCount = 200;
  ctx.strokeStyle = '#8B7355';
  ctx.globalAlpha = 0.05;

  const seed = 42;
  let rngState = seed;
  const seededRandom = () => {
    rngState = (rngState * 1664525 + 1013904223) & 0xffffffff;
    return (rngState >>> 0) / 4294967296;
  };

  for (let i = 0; i < fiberCount; i++) {
    const x = seededRandom() * width;
    const y = seededRandom() * height;
    const length = 10 + seededRandom() * 40;
    const angle = seededRandom() * Math.PI;
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;

    ctx.lineWidth = 0.3 + seededRandom() * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }

  ctx.globalAlpha = 1.0;
  return offscreen;
}

export function StrokeCanvas({ strokes, currentStrokeIndex, strokeProgress }: StrokeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const textureRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    textureRef.current = generatePaperTexture(CANVAS_SIZE, CANVAS_SIZE);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderLoop = (timestamp: number) => {
      if (!textureRef.current) {
        animFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      ctx.drawImage(textureRef.current, 0, 0);

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < strokes.length; i++) {
        const stroke = strokes[i];
        const x1 = stroke.startX * SCALE;
        const y1 = stroke.startY * SCALE;
        const x2 = stroke.endX * SCALE;
        const y2 = stroke.endY * SCALE;

        if (i < currentStrokeIndex) {
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          ctx.fillStyle = '#2c1810';
          ctx.font = 'bold 12px KaiTi, STKaiti, serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${i + 1}`, (x1 + x2) / 2, (y1 + y2) / 2 - 12);
        } else if (i === currentStrokeIndex) {
          ctx.globalAlpha = 1.0;
          const progressX = x1 + (x2 - x1) * strokeProgress;
          const progressY = y1 + (y2 - y1) * strokeProgress;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(progressX, progressY);
          ctx.stroke();

          const breathe = 0.5 + 0.5 * Math.sin(timestamp / 1000 * Math.PI * 2);
          const dotAlpha = 0.5 + 0.5 * breathe;

          ctx.globalAlpha = dotAlpha;
          ctx.fillStyle = '#ff0000';
          ctx.beginPath();
          ctx.arc(x1, y1, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#00aa00';
          ctx.beginPath();
          ctx.arc(x2, y2, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.globalAlpha = 1.0;
          ctx.fillStyle = '#2c1810';
          ctx.font = 'bold 16px KaiTi, STKaiti, serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const labelX = (x1 + progressX) / 2;
          const labelY = (y1 + progressY) / 2 - 15;
          ctx.fillText(`${i + 1}`, labelX, labelY);
        }
      }

      ctx.globalAlpha = 1.0;
      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [strokes, currentStrokeIndex, strokeProgress]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      style={{
        maxWidth: '90vw',
        height: 'auto',
        aspectRatio: '1 / 1',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(44, 24, 16, 0.15)',
      }}
    />
  );
}
