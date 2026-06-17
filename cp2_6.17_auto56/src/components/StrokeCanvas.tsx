import { useEffect, useRef } from 'react';
import type { Stroke } from '../data/hanziData';

interface StrokeCanvasProps {
  strokes: Stroke[];
  currentStrokeIndex: number;
  strokeProgress: number;
}

const CANVAS_SIZE = 500;
const SCALE = CANVAS_SIZE / 100;

export function StrokeCanvas({ strokes, currentStrokeIndex, strokeProgress }: StrokeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.fillStyle = '#f5e6c8';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

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
        } else if (i === currentStrokeIndex) {
          ctx.globalAlpha = 1.0;
          const progressX = x1 + (x2 - x1) * strokeProgress;
          const progressY = y1 + (y2 - y1) * strokeProgress;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(progressX, progressY);
          ctx.stroke();

          ctx.globalAlpha = 1.0;
          ctx.fillStyle = '#ff0000';
          ctx.beginPath();
          ctx.arc(x1, y1, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#00aa00';
          ctx.beginPath();
          ctx.arc(x2, y2, 3, 0, Math.PI * 2);
          ctx.fill();

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
    };

    render();
    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
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
