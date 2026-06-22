import { useEffect, useRef, useMemo } from 'react';
import type { Note } from '../types';
import './StatsPanel.css';

interface Props {
  notes: Note[];
  streak: number;
  dueCount: number;
}

interface DailyData {
  dateStr: string;
  dateLabel: string;
  newCount: number;
  reviewedCount: number;
}

function getLast7DaysData(notes: Note[]): DailyData[] {
  const result: DailyData[] = [];
  const now = new Date();
  const dayMs = 86400000;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * dayMs);
    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();
    const dateStr = `${y}-${m + 1}-${day}`;
    const dateLabel = `${m + 1}/${day}`;
    const startOfDay = new Date(y, m, day).getTime();
    const endOfDay = startOfDay + dayMs;
    const newCount = notes.filter(n => n.createdAt >= startOfDay && n.createdAt < endOfDay).length;
    const reviewedCount = notes.filter(n =>
      n.lastReviewedAt !== undefined &&
      n.lastReviewedAt >= startOfDay &&
      n.lastReviewedAt < endOfDay
    ).length;
    result.push({ dateStr, dateLabel, newCount, reviewedCount });
  }
  return result;
}

function drawChart(
  canvas: HTMLCanvasElement,
  data: DailyData[],
  dpr: number
) {
  const cssWidth = canvas.clientWidth;
  const cssHeight = 240;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  canvas.style.height = `${cssHeight}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const padding = { top: 16, right: 16, bottom: 36, left: 36 };
  const chartW = cssWidth - padding.left - padding.right;
  const chartH = cssHeight - padding.top - padding.bottom;

  const maxVal = Math.max(
    1,
    ...data.map(d => Math.max(d.newCount, d.reviewedCount))
  );
  const niceMax = Math.ceil(maxVal / 2) * 2;
  const gridSteps = Math.min(4, niceMax);
  const stepVal = niceMax / gridSteps;

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let i = 0; i <= gridSteps; i++) {
    const y = padding.top + chartH - (i / gridSteps) * chartH;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartW, y);
    ctx.stroke();
    const val = Math.round(i * stepVal);
    ctx.fillText(String(val), padding.left - 8, y);
  }
  ctx.setLineDash([]);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const pointGap = chartW / (data.length - 1 || 1);
  data.forEach((d, i) => {
    const x = padding.left + i * pointGap;
    ctx.fillText(d.dateLabel, x, padding.top + chartH + 8);
  });

  const drawLine = (
    key: 'newCount' | 'reviewedCount',
    colorStart: string,
    colorEnd: string
  ) => {
    const gradient = ctx.createLinearGradient(padding.left, 0, padding.left + chartW, 0);
    gradient.addColorStop(0, colorStart);
    gradient.addColorStop(1, colorEnd);

    ctx.beginPath();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    data.forEach((d, i) => {
      const x = padding.left + i * pointGap;
      const ratio = Math.min(1, d[key] / niceMax);
      const y = padding.top + chartH - ratio * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    data.forEach((d, i) => {
      const x = padding.left + i * pointGap;
      const ratio = Math.min(1, d[key] / niceMax);
      const y = padding.top + chartH - ratio * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = key === 'newCount' ? colorStart : colorStart;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = key === 'newCount' ? '#6366f1' : '#10b981';
      ctx.fill();
    });
  };

  drawLine('newCount', '#6366f1', '#a5b4fc');
  drawLine('reviewedCount', '#10b981', '#6ee7b7');
}

export default function StatsPanel({ notes, streak, dueCount }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const data = useMemo(() => getLast7DaysData(notes), [notes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    drawChart(canvas, data, dpr);
    const handleResize = () => drawChart(canvas, data, window.devicePixelRatio || 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data]);

  return (
    <div className="stats-panel">
      <div className="stats-cards-row">
        <div className="stats-card">
          <div className="stats-card-label">总词汇量</div>
          <div className="stats-card-value">{notes.length}</div>
          <div className="stats-card-sub">已收录的词汇总数</div>
        </div>
        <div className="stats-card">
          <div className="stats-card-label">连续复习</div>
          <div className="stats-card-value small">
            <span className="stats-card-icon">🔥</span>
            {streak}
          </div>
          <div className="stats-card-sub">天</div>
        </div>
        <div className="stats-card">
          <div className="stats-card-label">今日待复习</div>
          <div className="stats-card-value small" style={{ color: dueCount > 0 ? '#6366f1' : '#10b981' }}>
            {dueCount}
          </div>
          <div className="stats-card-sub">{dueCount === 0 ? '全部完成 🎉' : '去复习吧！'}</div>
        </div>
      </div>

      <div className="stats-main">
        <div className="stats-chart-card">
          <div className="stats-chart-title">最近 7 天学习情况</div>
          <div className="stats-chart-legend">
            <div className="stats-legend-item">
              <span className="stats-legend-dot new"></span>
              <span>新增词汇</span>
            </div>
            <div className="stats-legend-item">
              <span className="stats-legend-dot reviewed"></span>
              <span>完成复习</span>
            </div>
          </div>
          <canvas ref={canvasRef} className="stats-chart-canvas"></canvas>
        </div>

        <div className="stats-side">
          <div className="stats-card">
            <div className="stats-card-label">总词汇量</div>
            <div className="stats-card-value">{notes.length}</div>
            <div className="stats-card-sub">已收录的词汇总数</div>
          </div>
          <div className="stats-card">
            <div className="stats-card-label">连续复习</div>
            <div className="stats-card-value small">
              <span className="stats-card-icon">🔥</span>
              {streak}
            </div>
            <div className="stats-card-sub">天</div>
          </div>
          <div className="stats-card">
            <div className="stats-card-label">今日待复习</div>
            <div className="stats-card-value small" style={{ color: dueCount > 0 ? '#6366f1' : '#10b981' }}>
              {dueCount}
            </div>
            <div className="stats-card-sub">{dueCount === 0 ? '全部完成 🎉' : '去复习吧！'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
