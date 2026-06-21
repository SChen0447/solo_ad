import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CurvePoint } from '../types';

interface TemperatureCurveEditorProps {
  value: CurvePoint[];
  onChange: (points: CurvePoint[]) => void;
  duration?: number;
  color?: string;
  readOnly?: boolean;
  showFill?: boolean;
}

const TemperatureCurveEditor: React.FC<TemperatureCurveEditorProps> = ({
  value,
  onChange,
  duration = 20,
  color = '#8B4513',
  readOnly = false,
  showFill = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const animationRef = useRef<number>();
  const targetPointsRef = useRef<CurvePoint[]>(value);
  const currentPointsRef = useRef<CurvePoint[]>([...value]);

  const padding = { top: 30, right: 30, bottom: 40, left: 50 };
  const minTemp = 100;
  const maxTemp = 250;

  const getCanvasCoords = useCallback((canvas: HTMLCanvasElement) => {
    const width = canvas.width;
    const height = canvas.height;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    return {
      width,
      height,
      chartWidth,
      chartHeight,
      x: (time: number) => padding.left + (time / duration) * chartWidth,
      y: (temp: number) => padding.top + ((maxTemp - temp) / (maxTemp - minTemp)) * chartHeight,
      time: (x: number) => ((x - padding.left) / chartWidth) * duration,
      temp: (y: number) => maxTemp - ((y - padding.top) / chartHeight) * (maxTemp - minTemp),
    };
  }, [duration]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(canvas);
    const points = currentPointsRef.current;

    ctx.clearRect(0, 0, coords.width, coords.height);

    ctx.fillStyle = '#FFFAF0';
    ctx.fillRect(0, 0, coords.width, coords.height);

    ctx.strokeStyle = '#E8E0D5';
    ctx.lineWidth = 1;

    for (let t = 0; t <= duration; t += 2) {
      const x = coords.x(t);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, coords.height - padding.bottom);
      ctx.stroke();
    }

    for (let temp = minTemp; temp <= maxTemp; temp += 25) {
      const y = coords.y(temp);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(coords.width - padding.right, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#6B4423';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';

    for (let temp = minTemp; temp <= maxTemp; temp += 25) {
      const y = coords.y(temp);
      ctx.fillText(`${temp}°`, padding.left - 8, y + 4);
    }

    ctx.textAlign = 'center';
    for (let t = 0; t <= duration; t += 4) {
      const x = coords.x(t);
      ctx.fillText(`${t}'`, x, coords.height - padding.bottom + 20);
    }

    ctx.fillStyle = '#4A2C1A';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('温度 (°C)', padding.left - 30, padding.top - 10);
    ctx.fillText('时间 (分钟)', coords.width - padding.right, coords.height - 10);

    if (points.length > 0) {
      if (showFill) {
        ctx.beginPath();
        ctx.moveTo(coords.x(points[0].time), coords.y(points[0].temp));
        for (let i = 1; i < points.length; i++) {
          const xc = (coords.x(points[i - 1].time) + coords.x(points[i].time)) / 2;
          const yc = (coords.y(points[i - 1].temp) + coords.y(points[i].temp)) / 2;
          ctx.quadraticCurveTo(coords.x(points[i - 1].time), coords.y(points[i - 1].temp), xc, yc);
        }
        ctx.lineTo(coords.x(points[points.length - 1].time), coords.y(points[points.length - 1].temp));
        ctx.lineTo(coords.x(points[points.length - 1].time), coords.height - padding.bottom);
        ctx.lineTo(coords.x(points[0].time), coords.height - padding.bottom);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, padding.top, 0, coords.height - padding.bottom);
        gradient.addColorStop(0, color + '40');
        gradient.addColorStop(1, color + '05');
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(coords.x(points[0].time), coords.y(points[0].temp));
      for (let i = 1; i < points.length; i++) {
        const xc = (coords.x(points[i - 1].time) + coords.x(points[i].time)) / 2;
        const yc = (coords.y(points[i - 1].temp) + coords.y(points[i].temp)) / 2;
        ctx.quadraticCurveTo(coords.x(points[i - 1].time), coords.y(points[i - 1].temp), xc, yc);
      }
      ctx.lineTo(coords.x(points[points.length - 1].time), coords.y(points[points.length - 1].temp));
      ctx.stroke();

      if (!readOnly) {
        points.forEach((point, index) => {
          const x = coords.x(point.time);
          const y = coords.y(point.temp);

          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.5;
          ctx.stroke();

          if (hoverIndex === index || draggingIndex === index) {
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.fillStyle = color + '20';
            ctx.fill();
          }
        });

        if (draggingIndex !== null && points[draggingIndex]) {
          const point = points[draggingIndex];
          const x = coords.x(point.time);
          const y = coords.y(point.temp);

          const bubbleWidth = 70;
          const bubbleHeight = 26;
          const bubbleX = x - bubbleWidth / 2;
          const bubbleY = y - bubbleHeight - 16;

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 6);
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(x - 6, bubbleY + bubbleHeight);
          ctx.lineTo(x, bubbleY + bubbleHeight + 6);
          ctx.lineTo(x + 6, bubbleY + bubbleHeight);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${Math.round(point.temp)}°C`, x, bubbleY + 17);
        }
      }
    }
  }, [color, duration, getCanvasCoords, hoverIndex, draggingIndex, readOnly, showFill]);

  const animate = useCallback(() => {
    const targets = targetPointsRef.current;
    const currents = currentPointsRef.current;
    let needsUpdate = false;

    for (let i = 0; i < targets.length; i++) {
      const dx = targets[i].time - currents[i].time;
      const dy = targets[i].temp - currents[i].temp;

      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        currents[i].time += dx * 0.15;
        currents[i].temp += dy * 0.15;
        needsUpdate = true;
      } else {
        currents[i].time = targets[i].time;
        currents[i].temp = targets[i].temp;
      }
    }

    draw();

    if (needsUpdate) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [draw]);

  useEffect(() => {
    targetPointsRef.current = [...value];
    if (draggingIndex === null) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = requestAnimationFrame(animate);
    } else {
      draw();
    }
  }, [value, animate, draw, draggingIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = 300 * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = '300px';
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      draw();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [draw]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    };
  };

  const findNearestPoint = (x: number, y: number): number | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const coords = getCanvasCoords(canvas);
    let nearest = -1;
    let minDist = Infinity;

    value.forEach((point, index) => {
      const px = coords.x(point.time);
      const py = coords.y(point.temp);
      const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
      if (dist < 20 && dist < minDist) {
        minDist = dist;
        nearest = index;
      }
    });

    return nearest >= 0 ? nearest : null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const pos = getMousePos(e);
    const index = findNearestPoint(pos.x, pos.y);
    if (index !== null) {
      setDraggingIndex(index);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);

    if (draggingIndex !== null) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const coords = getCanvasCoords(canvas);

      let newTemp = coords.temp(pos.y);
      newTemp = Math.max(minTemp, Math.min(maxTemp, newTemp));

      const newPoints = [...value];
      newPoints[draggingIndex] = {
        ...newPoints[draggingIndex],
        temp: Math.round(newTemp),
      };
      currentPointsRef.current = newPoints;
      onChange(newPoints);
      draw();
    } else if (!readOnly) {
      const index = findNearestPoint(pos.x, pos.y);
      setHoverIndex(index);
      draw();
    }
  };

  const handleMouseUp = () => {
    setDraggingIndex(null);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(animate);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    e.preventDefault();
    const pos = getTouchPos(e);
    const index = findNearestPoint(pos.x, pos.y);
    if (index !== null) {
      setDraggingIndex(index);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (draggingIndex === null || readOnly) return;
    e.preventDefault();
    const pos = getTouchPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const coords = getCanvasCoords(canvas);

    let newTemp = coords.temp(pos.y);
    newTemp = Math.max(minTemp, Math.min(maxTemp, newTemp));

    const newPoints = [...value];
    newPoints[draggingIndex] = {
      ...newPoints[draggingIndex],
      temp: Math.round(newTemp),
    };
    currentPointsRef.current = newPoints;
    onChange(newPoints);
    draw();
  };

  const handleTouchEnd = () => {
    setDraggingIndex(null);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor: readOnly ? 'default' : draggingIndex !== null ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      />
    </div>
  );
};

export default TemperatureCurveEditor;
