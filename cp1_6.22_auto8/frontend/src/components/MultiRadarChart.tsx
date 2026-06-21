import React, { useRef, useEffect } from 'react';
import type { FlavorScore } from '../types';

interface MultiRadarChartProps {
  dataSets: { flavors: FlavorScore[]; color: string; label: string }[];
  size?: number;
}

const MultiRadarChart: React.FC<MultiRadarChartProps> = ({ dataSets, size = 350 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const displaySize = Math.min(size, container.offsetWidth || 350);
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const centerX = displaySize / 2;
    const centerY = displaySize / 2;
    const radius = displaySize / 2 - 50;
    const levels = 5;

    ctx.clearRect(0, 0, displaySize, displaySize);

    ctx.fillStyle = '#FFFAF0';
    ctx.fillRect(0, 0, displaySize, displaySize);

    const count = dataSets[0]?.flavors.length || 8;

    for (let level = levels; level >= 1; level--) {
      const levelRadius = (radius * level) / levels;
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
        const x = centerX + Math.cos(angle) * levelRadius;
        const y = centerY + Math.sin(angle) * levelRadius;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fillStyle = level % 2 === 0 ? 'rgba(139, 69, 19, 0.03)' : 'rgba(139, 69, 19, 0.06)';
      ctx.fill();
    }

    ctx.strokeStyle = '#D4C4B0';
    ctx.lineWidth = 1;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    if (dataSets.length > 0 && dataSets[0].flavors.length > 0) {
      const flavors = dataSets[0].flavors;
      ctx.fillStyle = '#6B4423';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';

      flavors.forEach((flavor, i) => {
        const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
        const labelRadius = radius + 25;
        const x = centerX + Math.cos(angle) * labelRadius;
        const y = centerY + Math.sin(angle) * labelRadius;
        ctx.fillText(flavor.name, x, y + 4);
      });
    }

    dataSets.forEach(({ flavors, color }) => {
      if (flavors.length === 0) return;

      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
        const scoreRadius = (flavors[i]?.score || 0) / 10;
        const x = centerX + Math.cos(angle) * radius * scoreRadius;
        const y = centerY + Math.sin(angle) * radius * scoreRadius;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();

      ctx.fillStyle = color + '50';
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  });

  useEffect(() => {
    draw();
  }, [dataSets, size]);

  return (
    <div ref={containerRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default MultiRadarChart;
