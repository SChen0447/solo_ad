import React, { useRef, useEffect, useState } from 'react';
import { WeightRecord } from '../types';
import './WeightChart.css';

interface WeightChartProps {
  weights: WeightRecord[];
  species: '猫' | '狗';
}

interface TooltipData {
  x: number;
  y: number;
  date: string;
  weight: number;
}

export const WeightChart: React.FC<WeightChartProps> = ({ weights, species }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const lineColor = species === '猫' ? '#e67e22' : '#2ecc71';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 30, right: 30, bottom: 50, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const recentWeights = [...weights]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10);

    if (recentWeights.length === 0) {
      ctx.fillStyle = '#999999';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无体重记录', width / 2, height / 2);
      return;
    }

    const weightValues = recentWeights.map(w => w.weight);
    const minWeight = Math.min(...weightValues) - 1;
    const maxWeight = Math.max(...weightValues) + 1;

    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      const weight = maxWeight - ((maxWeight - minWeight) / 4) * i;
      ctx.fillStyle = '#999999';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(weight.toFixed(1), padding.left - 10, y + 4);
    }

    ctx.fillStyle = '#999999';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(recentWeights.length / 5));
    recentWeights.forEach((w, i) => {
      if (i % step === 0 || i === recentWeights.length - 1) {
        const x = padding.left + (chartWidth / (recentWeights.length - 1 || 1)) * i;
        const date = new Date(w.date);
        ctx.fillText(`${date.getMonth() + 1}/${date.getDate()}`, x, height - padding.bottom + 20);
      }
    });

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();

    recentWeights.forEach((w, i) => {
      const x = padding.left + (chartWidth / (recentWeights.length - 1 || 1)) * i;
      const y = padding.top + chartHeight - ((w.weight - minWeight) / (maxWeight - minWeight)) * chartHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, lineColor + '40');
    gradient.addColorStop(1, lineColor + '00');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    recentWeights.forEach((w, i) => {
      const x = padding.left + (chartWidth / (recentWeights.length - 1 || 1)) * i;
      const y = padding.top + chartHeight - ((w.weight - minWeight) / (maxWeight - minWeight)) * chartHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.lineTo(padding.left + chartWidth, height - padding.bottom);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.closePath();
    ctx.fill();

    recentWeights.forEach((w, i) => {
      const x = padding.left + (chartWidth / (recentWeights.length - 1 || 1)) * i;
      const y = padding.top + chartHeight - ((w.weight - minWeight) / (maxWeight - minWeight)) * chartHeight;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.fillStyle = '#666666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('日期', width / 2, height - 15);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('体重 (kg)', 0, 0);
    ctx.restore();

    const handleMouseMove = (e: MouseEvent) => {
      const canvasRect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - canvasRect.left;
      const mouseY = e.clientY - canvasRect.top;

      let closestPoint: TooltipData | null = null;
      let closestDistance = Infinity;

      recentWeights.forEach((w, i) => {
        const x = padding.left + (chartWidth / (recentWeights.length - 1 || 1)) * i;
        const y = padding.top + chartHeight - ((w.weight - minWeight) / (maxWeight - minWeight)) * chartHeight;
        const distance = Math.sqrt(Math.pow(mouseX - x, 2) + Math.pow(mouseY - y, 2));

        if (distance < 15 && distance < closestDistance) {
          closestDistance = distance;
          closestPoint = { x, y, date: w.date, weight: w.weight };
        }
      });

      setTooltip(closestPoint);
    };

    const handleMouseLeave = () => {
      setTooltip(null);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [weights, species, lineColor]);

  return (
    <div className="weight-chart-container" ref={containerRef}>
      <canvas ref={canvasRef} className="weight-chart-canvas" />
      {tooltip && (
        <div
          className="chart-tooltip"
          style={{
            left: tooltip.x + 60,
            top: tooltip.y + 10,
          }}
        >
          <div className="tooltip-date">{tooltip.date}</div>
          <div className="tooltip-weight">体重: {tooltip.weight.toFixed(1)} kg</div>
        </div>
      )}
    </div>
  );
};
