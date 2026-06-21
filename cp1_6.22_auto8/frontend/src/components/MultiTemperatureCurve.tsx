import React, { useRef, useEffect, useState } from 'react';
import type { CurvePoint } from '../types';
import type { RoastBatch } from '../types';

interface MultiTemperatureCurveProps {
  batches: RoastBatch[];
  colors: string[];
}

const MultiTemperatureCurve: React.FC<MultiTemperatureCurveProps> = ({ batches, colors }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; batchName: string; temp: number } | null>(null);

  const padding = { top: 30, right: 30, bottom: 50, left: 50 };
  const minTemp = 100;
  const maxTemp = 250;
  const maxDuration = 20;

  const getBeanName = (beanId: string) => {
    const beans = [
      { id: 'yirgacheffe', name: '耶加雪菲' },
      { id: 'huila', name: '蕙兰' },
      { id: 'bluemountain', name: '蓝山' },
      { id: 'mandheling', name: '曼特宁' },
      { id: 'guji', name: '古吉' },
      { id: 'panama', name: '瑰夏' },
      { id: 'costa', name: '哥斯达黎加' },
      { id: 'kenya', name: '肯尼亚AA' },
      { id: 'sumatra', name: '苏门答腊' },
      { id: 'brazil', name: '喜拉多' },
      { id: 'guatemala', name: '危地马拉' },
      { id: 'yunnan', name: '云南保山' },
      { id: 'kona', name: '科纳' },
      { id: 'salvador', name: '萨尔瓦多' },
      { id: 'tanzania', name: '坦桑尼亚' },
    ];
    return beans.find(b => b.id === beanId)?.name || beanId;
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = container.offsetWidth;
    const displayHeight = 320;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const chartWidth = displayWidth - padding.left - padding.right;
    const chartHeight = displayHeight - padding.top - padding.bottom;

    const x = (time: number) => padding.left + (time / maxDuration) * chartWidth;
    const y = (temp: number) => padding.top + ((maxTemp - temp) / (maxTemp - minTemp)) * chartHeight;

    ctx.clearRect(0, 0, displayWidth, displayHeight);

    ctx.fillStyle = '#FFFAF0';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    ctx.strokeStyle = '#E8E0D5';
    ctx.lineWidth = 1;

    for (let t = 0; t <= maxDuration; t += 2) {
      const xPos = x(t);
      ctx.beginPath();
      ctx.moveTo(xPos, padding.top);
      ctx.lineTo(xPos, displayHeight - padding.bottom);
      ctx.stroke();
    }

    for (let temp = minTemp; temp <= maxTemp; temp += 25) {
      const yPos = y(temp);
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(displayWidth - padding.right, yPos);
      ctx.stroke();
    }

    ctx.fillStyle = '#6B4423';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';

    for (let temp = minTemp; temp <= maxTemp; temp += 25) {
      const yPos = y(temp);
      ctx.fillText(`${temp}°`, padding.left - 8, yPos + 4);
    }

    ctx.textAlign = 'center';
    for (let t = 0; t <= maxDuration; t += 4) {
      const xPos = x(t);
      ctx.fillText(`${t}'`, xPos, displayHeight - padding.bottom + 20);
    }

    batches.forEach((batch, batchIndex) => {
      const points = batch.curveData;
      const color = colors[batchIndex % colors.length];

      if (points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(x(points[0].time), y(points[0].temp));
        for (let i = 1; i < points.length; i++) {
          const xc = (x(points[i - 1].time) + x(points[i].time)) / 2;
          const yc = (y(points[i - 1].temp) + y(points[i].temp)) / 2;
          ctx.quadraticCurveTo(x(points[i - 1].time), y(points[i - 1].temp), xc, yc);
        }
        ctx.lineTo(x(points[points.length - 1].time), y(points[points.length - 1].temp));
        ctx.lineTo(x(points[points.length - 1].time), displayHeight - padding.bottom);
        ctx.lineTo(x(points[0].time), displayHeight - padding.bottom);
        ctx.closePath();

        ctx.fillStyle = color + '20';
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.moveTo(x(points[0].time), y(points[0].temp));
        for (let i = 1; i < points.length; i++) {
          const xc = (x(points[i - 1].time) + x(points[i].time)) / 2;
          const yc = (y(points[i - 1].temp) + y(points[i].temp)) / 2;
          ctx.quadraticCurveTo(x(points[i - 1].time), y(points[i - 1].temp), xc, yc);
        }
        ctx.lineTo(x(points[points.length - 1].time), y(points[points.length - 1].temp));
        ctx.stroke();
      }
    });

    if (hoverInfo) {
      ctx.beginPath();
      ctx.arc(hoverInfo.x, hoverInfo.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#4A2C1A';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;
    const time = ((mouseX - padding.left) / chartWidth) * maxDuration;

    let nearest: { batch: RoastBatch; temp: number; dist: number; pointY: number } | null = null;

    batches.forEach(batch => {
      const points = batch.curveData;
      for (let i = 0; i < points.length - 1; i++) {
        if (time >= points[i].time && time <= points[i + 1].time) {
          const ratio = (time - points[i].time) / (points[i + 1].time - points[i].time);
          const temp = points[i].temp + ratio * (points[i + 1].temp - points[i].temp);
          const pointY = padding.top + ((maxTemp - temp) / (maxTemp - minTemp)) * chartHeight;
          const dist = Math.abs(mouseY - pointY);

          if (!nearest || dist < nearest.dist) {
            nearest = { batch, temp, dist, pointY };
          }
          break;
        }
      }
    });

    if (nearest && nearest.dist < 50) {
      setHoverInfo({
        x: mouseX,
        y: nearest.pointY,
        batchName: getBeanName(nearest.batch.beanId),
        temp: Math.round(nearest.temp),
      });
    } else {
      setHoverInfo(null);
    }

    draw();
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
    draw();
  };

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  });

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'crosshair' }}
      />
      {hoverInfo && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(hoverInfo.x + 10, (containerRef.current?.offsetWidth || 300) - 120),
            top: hoverInfo.y - 40,
            background: 'rgba(74, 44, 26, 0.9)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 600 }}>{hoverInfo.batchName}</div>
          <div>{hoverInfo.temp}°C</div>
        </div>
      )}
    </div>
  );
};

export default MultiTemperatureCurve;
