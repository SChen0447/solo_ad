import React, { useEffect, useRef } from 'react';

interface RadarChartProps {
  data: {
    label: string;
    value: number;
    max: number;
  }[];
  width?: number;
  height?: number;
}

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'];

const RadarChart: React.FC<RadarChartProps> = ({
  data,
  width = 300,
  height = 300,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 30;
    const sides = data.length;
    const angleStep = (Math.PI * 2) / sides;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(245, 245, 245, 0.8)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 10, 0, Math.PI * 2);
    ctx.fill();

    for (let level = 5; level >= 1; level--) {
      const levelRadius = (radius * level) / 5;
      ctx.beginPath();
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      for (let i = 0; i <= sides; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = centerX + Math.cos(angle) * levelRadius;
        const y = centerY + Math.sin(angle) * levelRadius;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.stroke();
    }

    ctx.setLineDash([]);
    for (let i = 0; i < sides; i++) {
      const angle = i * angleStep - Math.PI / 2;
      ctx.beginPath();
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      );
      ctx.stroke();
    }

    ctx.beginPath();
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    COLORS.forEach((color, i) => {
      gradient.addColorStop(i / (COLORS.length - 1), color);
    });
    ctx.fillStyle = 'rgba(102, 126, 234, 0.3)';
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;

    for (let i = 0; i < sides; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const valueRatio = data[i].value / data[i].max;
      const pointRadius = radius * valueRatio;
      const x = centerX + Math.cos(angle) * pointRadius;
      const y = centerY + Math.sin(angle) * pointRadius;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < sides; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const valueRatio = data[i].value / data[i].max;
      const pointRadius = radius * valueRatio;
      const x = centerX + Math.cos(angle) * pointRadius;
      const y = centerY + Math.sin(angle) * pointRadius;

      ctx.beginPath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < sides; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const labelRadius = radius + 20;
      const x = centerX + Math.cos(angle) * labelRadius;
      const y = centerY + Math.sin(angle) * labelRadius;

      ctx.fillStyle = '#374151';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let textX = x;
      let textY = y;

      if (Math.abs(Math.cos(angle)) < 0.1) {
        textX = x;
      } else if (Math.cos(angle) > 0) {
        textX = x + 20;
        ctx.textAlign = 'left';
      } else {
        textX = x - 20;
        ctx.textAlign = 'right';
      }

      ctx.fillText(data[i].label, textX, textY);
      ctx.fillText(
        data[i].value.toString(),
        textX,
        textY + 14
      );
    }
  }, [data, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'block' }}
    />
  );
};

export default RadarChart;
