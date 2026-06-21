import React, { useRef, useEffect } from 'react';
import type { FlavorScore } from '../types';

interface FlavorRadarChartProps {
  flavors: FlavorScore[];
  color?: string;
  size?: number;
  showLabels?: boolean;
  opacity?: number;
}

const FlavorRadarChart: React.FC<FlavorRadarChartProps> = ({
  flavors,
  color = '#8B4513',
  size = 300,
  showLabels = true,
  opacity = 0.6,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const displaySize = Math.min(size, container.offsetWidth || 300);
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const centerX = displaySize / 2;
    const centerY = displaySize / 2;
    const radius = displaySize / 2 - 40;
    const levels = 5;
    const count = flavors.length;

    ctx.clearRect(0, 0, displaySize, displaySize);

    ctx.fillStyle = '#FFFAF0';
    ctx.fillRect(0, 0, displaySize, displaySize);

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

    if (showLabels && flavors.length > 0) {
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

    if (flavors.length > 0) {
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

      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, color + '80');
      gradient.addColorStop(1, color + '20');
      ctx.fillStyle = gradient;
      ctx.globalAlpha = opacity;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      flavors.forEach((flavor, i) => {
        const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
        const scoreRadius = (flavor.score || 0) / 10;
        const x = centerX + Math.cos(angle) * radius * scoreRadius;
        const y = centerY + Math.sin(angle) * radius * scoreRadius;

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }
  };

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  });

  useEffect(() => {
    draw();
  }, [flavors, color, size, showLabels, opacity]);

  return (
    <div ref={containerRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default FlavorRadarChart;
