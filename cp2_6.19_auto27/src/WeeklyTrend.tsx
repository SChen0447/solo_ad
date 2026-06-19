import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import type { MoodRecord } from './types';
import { MOOD_CONFIGS } from './types';
import { getWeekDates, formatDate, getDominantMood, getAverageMoodValue } from './utils/storage';

interface WeeklyTrendProps {
  records: MoodRecord[];
}

interface TooltipData {
  x: number;
  y: number;
  date: string;
  value: number;
}

interface ChartPoint {
  x: number;
  y: number | null;
  value: number;
  date: string;
}

function getCatmullRomControlPoints(points: { x: number; y: number }[]): {
  cp1x: number;
  cp1y: number;
  cp2x: number;
  cp2y: number;
}[] {
  const result: { cp1x: number; cp1y: number; cp2x: number; cp2y: number }[] = [];
  const tension = 0.4;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) * tension / 6;
    const cp1y = p1.y + (p2.y - p0.y) * tension / 6;
    const cp2x = p2.x - (p3.x - p1.x) * tension / 6;
    const cp2y = p2.y - (p3.y - p1.y) * tension / 6;

    result.push({ cp1x, cp1y, cp2x, cp2y });
  }
  return result;
}

export default function WeeklyTrend({ records }: WeeklyTrendProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const resizeTimerRef = useRef<number | null>(null);
  const tooltipCacheRef = useRef<ChartPoint[]>([]);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const weekDates = useMemo(() => getWeekDates(), []);
  
  const dailyData = useMemo(() => {
    return weekDates.map((date) => {
      const dateStr = formatDate(date);
      const dayRecords = records.filter((r) => r.date === dateStr);
      const dominantMood = getDominantMood(dayRecords);
      const avgValue = dayRecords.length > 0 
        ? getAverageMoodValue(dayRecords, MOOD_CONFIGS)
        : 0;
      return {
        date: dateStr,
        dayLabel: `${date.getMonth() + 1}/${date.getDate()}`,
        recordsCount: dayRecords.length,
        dominantMood,
        avgValue
      };
    });
  }, [weekDates, records]);

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      ctx.fillStyle = '#999';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const value = 5 - i;
      ctx.fillText(String(value), padding.left - 8, y);
    }

    const dataPoints: ChartPoint[] = dailyData.map((d, i) => ({
      x: padding.left + (chartWidth / 6) * i,
      y: d.avgValue > 0 ? padding.top + chartHeight - (chartHeight / 5) * d.avgValue : null,
      value: d.avgValue,
      date: d.date
    }));

    tooltipCacheRef.current = dataPoints;

    const validPoints = dataPoints.filter((p) => p.y !== null) as { x: number; y: number }[];
    
    if (validPoints.length >= 2) {
      const controlPoints = getCatmullRomControlPoints(validPoints);

      const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, 'rgba(156, 39, 176, 0.25)');
      gradient.addColorStop(1, 'rgba(156, 39, 176, 0)');

      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.moveTo(validPoints[0].x, height - padding.bottom);
      ctx.lineTo(validPoints[0].x, validPoints[0].y);
      for (let i = 0; i < controlPoints.length; i++) {
        const cp = controlPoints[i];
        const next = validPoints[i + 1];
        ctx.bezierCurveTo(cp.cp1x, cp.cp1y, cp.cp2x, cp.cp2y, next.x, next.y);
      }
      ctx.lineTo(validPoints[validPoints.length - 1].x, height - padding.bottom);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = '#9c27b0';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(validPoints[0].x, validPoints[0].y);
      for (let i = 0; i < controlPoints.length; i++) {
        const cp = controlPoints[i];
        const next = validPoints[i + 1];
        ctx.bezierCurveTo(cp.cp1x, cp.cp1y, cp.cp2x, cp.cp2y, next.x, next.y);
      }
      ctx.stroke();
    }

    dataPoints.forEach((p) => {
      if (p.y !== null) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#9c27b0';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#9c27b0';
        ctx.fill();
      }

      ctx.fillStyle = '#666';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const dayIndex = weekDates.findIndex((d) => formatDate(d) === p.date);
      const weekLabels = ['日', '一', '二', '三', '四', '五', '六'];
      const weekDay = weekDates[dayIndex].getDay();
      ctx.fillText(weekLabels[weekDay], p.x, height - padding.bottom + 8);
      ctx.fillText(dailyData[dayIndex].dayLabel, p.x, height - padding.bottom + 22);
    });
  }, [dailyData, weekDates]);

  const debouncedDraw = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      drawChart();
      rafRef.current = null;
    });
  }, [drawChart]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    const dataPoints = tooltipCacheRef.current;
    let foundPoint: TooltipData | null = null;
    for (const p of dataPoints) {
      if (p.y !== null && Math.abs(mouseX - p.x) < 25) {
        const dayIndex = weekDates.findIndex((d) => formatDate(d) === p.date);
        foundPoint = {
          x: p.x,
          y: p.y,
          date: dailyData[dayIndex].date,
          value: Math.round(p.value * 10) / 10
        };
        break;
      }
    }
    setTooltip(foundPoint);
  }, [weekDates, dailyData]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  useEffect(() => {
    debouncedDraw();
  }, [debouncedDraw]);

  useEffect(() => {
    const handleResize = () => {
      if (resizeTimerRef.current !== null) {
        window.clearTimeout(resizeTimerRef.current);
      }
      resizeTimerRef.current = window.setTimeout(() => {
        debouncedDraw();
        resizeTimerRef.current = null;
      }, 80);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimerRef.current !== null) {
        window.clearTimeout(resizeTimerRef.current);
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [debouncedDraw]);

  return (
    <div className="section">
      <h2 className="section-title">本周情绪趋势</h2>
      
      <div className="weekly-trend">
        <div>
          <div className="mood-cards">
            {dailyData.map((day, index) => (
              <div
                key={day.date}
                className={`mood-card ${day.dominantMood ? '' : 'mood-card-empty'}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="mood-card-emoji">
                  {day.dominantMood ? MOOD_CONFIGS[day.dominantMood].emoji : '❓'}
                </div>
                <div className="mood-card-date">{day.dayLabel}</div>
                {day.recordsCount > 0 && (
                  <div className="mood-card-count">{day.recordsCount}条</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="chart-container" ref={containerRef}>
          <canvas
            ref={canvasRef}
            className="chart-canvas"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
          {tooltip && (
            <div
              className="chart-tooltip"
              style={{ left: tooltip.x, top: tooltip.y }}
            >
              {tooltip.date} · 情绪值 {tooltip.value}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
