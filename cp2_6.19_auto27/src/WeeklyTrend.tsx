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

export default function WeeklyTrend({ records }: WeeklyTrendProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const weekDates = useMemo(() => getWeekDates(), []);
  
  const dailyData = useMemo(() => {
    return weekDates.map((date) => {
      const dateStr = formatDate(date);
      const dayRecords = records.filter((r) => r.date === dateStr);
      const dominantMood = getDominantMood(dayRecords);
      const avgValue = getAverageMoodValue(dayRecords, MOOD_CONFIGS);
      return {
        date: dateStr,
        dayLabel: `${date.getMonth() + 1}/${date.getDate()}`,
        records: dayRecords,
        dominantMood,
        avgValue: dayRecords.length > 0 ? avgValue : 0
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

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      ctx.fillStyle = '#999';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(5 - i), padding.left - 8, y);
    }

    const dataPoints = dailyData.map((d, i) => ({
      x: padding.left + (chartWidth / 6) * i,
      y: d.avgValue > 0 ? padding.top + chartHeight - (chartHeight / 5) * d.avgValue : null,
      value: d.avgValue,
      date: d.date
    }));

    const validPoints = dataPoints.filter((p) => p.y !== null);
    if (validPoints.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = '#9c27b0';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < validPoints.length - 1; i++) {
        const p1 = validPoints[i];
        const p2 = validPoints[i + 1];
        const midX = (p1.x + p2.x) / 2;
        const cpx1 = midX;
        const cpx2 = midX;

        if (i === 0) {
          ctx.moveTo(p1.x, p1.y as number);
        }
        ctx.bezierCurveTo(cpx1, p1.y as number, cpx2, p2.y as number, p2.x, p2.y as number);
      }
      ctx.stroke();

      const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, 'rgba(156, 39, 176, 0.3)');
      gradient.addColorStop(1, 'rgba(156, 39, 176, 0)');

      ctx.beginPath();
      ctx.fillStyle = gradient;
      const firstPoint = validPoints[0];
      const lastPoint = validPoints[validPoints.length - 1];
      ctx.moveTo(firstPoint.x, height - padding.bottom);
      ctx.lineTo(firstPoint.x, firstPoint.y as number);
      for (let i = 0; i < validPoints.length - 1; i++) {
        const p1 = validPoints[i];
        const p2 = validPoints[i + 1];
        const midX = (p1.x + p2.x) / 2;
        const cpx1 = midX;
        const cpx2 = midX;
        ctx.bezierCurveTo(cpx1, p1.y as number, cpx2, p2.y as number, p2.x, p2.y as number);
      }
      ctx.lineTo(lastPoint.x, height - padding.bottom);
      ctx.closePath();
      ctx.fill();
    }

    dataPoints.forEach((p) => {
      if (p.y !== null) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#9c27b0';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#9c27b0';
        ctx.fill();
      }

      ctx.fillStyle = '#666';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const dayIndex = weekDates.findIndex((d) => formatDate(d) === p.date);
      const weekLabels = ['日', '一', '二', '三', '四', '五', '六'];
      const weekDay = weekDates[dayIndex].getDay();
      ctx.fillText(weekLabels[weekDay], p.x, height - padding.bottom + 8);
      ctx.fillText(dailyData[dayIndex].dayLabel, p.x, height - padding.bottom + 22);
    });

    canvas.onmousemove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let foundPoint: TooltipData | null = null;
      for (const p of dataPoints) {
        if (p.y !== null && Math.abs(mouseX - p.x) < 20) {
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
    };

    canvas.onmouseleave = () => {
      setTooltip(null);
    };
  }, [dailyData, weekDates]);

  useEffect(() => {
    drawChart();
    const handleResize = () => drawChart();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawChart]);

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
                {day.records.length > 0 && (
                  <div className="mood-card-count">{day.records.length}条</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="chart-container" ref={containerRef}>
          <canvas ref={canvasRef} className="chart-canvas" />
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
