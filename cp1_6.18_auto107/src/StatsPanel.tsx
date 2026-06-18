import React, { useMemo, useEffect, useRef, useState } from 'react';
import {
  useTimelineStore,
  EventCategory,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  StatsViewMode,
} from './timelineStore';
import { computeDailyStats, filterStatsByRange, generateRecommendations } from './timeAnalyzer';

const CATEGORIES: EventCategory[] = ['sleep', 'work', 'study', 'exercise', 'leisure', 'other'];

const CHART_PADDING = { top: 20, right: 16, bottom: 36, left: 44 };
const BAR_GAP = 4;

interface AnimatedBar {
  targetHeight: number;
  currentHeight: number;
}

export default function StatsPanel() {
  const events = useTimelineStore((s) => s.events);
  const selectedDate = useTimelineStore((s) => s.selectedDate);
  const statsViewMode = useTimelineStore((s) => s.statsViewMode);
  const setStatsViewMode = useTimelineStore((s) => s.setStatsViewMode);
  const weeklyGoals = useTimelineStore((s) => s.weeklyGoals);
  const setWeeklyGoals = useTimelineStore((s) => s.setWeeklyGoals);
  const generateRec = useTimelineStore((s) => s.setRecommendedEvents);
  const confirmRecommendedEvents = useTimelineStore((s) => s.confirmRecommendedEvents);
  const clearRecommendedEvents = useTimelineStore((s) => s.clearRecommendedEvents);
  const recommendedEvents = useTimelineStore((s) => s.recommendedEvents);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 320, height: 280 });
  const animatedBarsRef = useRef<AnimatedBar[]>([]);
  const animFrameRef = useRef<number>(0);

  const allStats = useMemo(() => computeDailyStats(events), [events]);
  const filteredStats = useMemo(
    () => filterStatsByRange(allStats, statsViewMode, selectedDate),
    [allStats, statsViewMode, selectedDate]
  );

  const maxMinutes = useMemo(() => {
    if (filteredStats.length === 0) return 480;
    let max = 0;
    for (const s of filteredStats) {
      for (const c of CATEGORIES) {
        if (s.categoryMinutes[c] > max) max = s.categoryMinutes[c];
      }
    }
    return Math.max(max, 60);
  }, [filteredStats]);

  useEffect(() => {
    const container = canvasRef.current?.parentElement;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width - 32;
        setCanvasSize({ width: Math.max(w, 200), height: 280 });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;
  }, [canvasSize]);

  useEffect(() => {
    const needed = filteredStats.length * CATEGORIES.length;
    while (animatedBarsRef.current.length < needed) {
      animatedBarsRef.current.push({ targetHeight: 0, currentHeight: 0 });
    }

    let idx = 0;
    for (const stat of filteredStats) {
      for (const cat of CATEGORIES) {
        const mins = stat.categoryMinutes[cat];
        const chartH = canvasSize.height - CHART_PADDING.top - CHART_PADDING.bottom;
        const targetH = (mins / maxMinutes) * chartH;
        if (animatedBarsRef.current[idx]) {
          animatedBarsRef.current[idx].targetHeight = targetH;
        }
        idx++;
      }
    }

    for (let i = idx; i < animatedBarsRef.current.length; i++) {
      animatedBarsRef.current[i].targetHeight = 0;
    }
  }, [filteredStats, maxMinutes, canvasSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

      const chartW = canvasSize.width - CHART_PADDING.left - CHART_PADDING.right;
      const chartH = canvasSize.height - CHART_PADDING.top - CHART_PADDING.bottom;

      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = CHART_PADDING.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(CHART_PADDING.left, y);
        ctx.lineTo(CHART_PADDING.left + chartW, y);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '10px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const mins = Math.round(maxMinutes - (maxMinutes / 4) * i);
        ctx.fillText(`${mins}`, CHART_PADDING.left - 6, y);
      }

      const numGroups = filteredStats.length;
      if (numGroups === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', canvasSize.width / 2, canvasSize.height / 2);
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const numBars = CATEGORIES.length;
      const groupWidth = chartW / numGroups;
      const totalBarWidth = groupWidth - BAR_GAP * (numBars + 1);
      const singleBarW = totalBarWidth / numBars;

      let barIdx = 0;
      for (let g = 0; g < numGroups; g++) {
        const groupX = CHART_PADDING.left + g * groupWidth;

        for (let b = 0; b < numBars; b++) {
          const bar = animatedBarsRef.current[barIdx];
          if (bar) {
            bar.currentHeight += (bar.targetHeight - bar.currentHeight) * 0.12;
            if (Math.abs(bar.currentHeight - bar.targetHeight) < 0.5) {
              bar.currentHeight = bar.targetHeight;
            }
          }
          const h = bar?.currentHeight || 0;
          const x = groupX + BAR_GAP + b * (singleBarW + BAR_GAP);
          const y = CHART_PADDING.top + chartH - h;

          if (h > 0) {
            ctx.fillStyle = CATEGORY_COLORS[CATEGORIES[b]];
            roundRect(ctx, x, y, singleBarW, h, 2);
            ctx.fill();
          }
          barIdx++;
        }

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const label = statsViewMode === 'day'
          ? filteredStats[g].date.slice(5)
          : filteredStats[g].date.slice(5);
        ctx.fillText(label, groupX + groupWidth / 2, CHART_PADDING.top + chartH + 6);
      }

      if (filteredStats.length > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,200,100,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        let started = false;
        for (let g = 0; g < numGroups; g++) {
          const groupX = CHART_PADDING.left + g * groupWidth + groupWidth / 2;
          const y = CHART_PADDING.top + chartH - (filteredStats[g].utilizationPercent / 100) * chartH;
          if (!started) {
            ctx.moveTo(groupX, y);
            started = true;
          } else {
            ctx.lineTo(groupX, y);
          }
        }
        ctx.stroke();

        for (let g = 0; g < numGroups; g++) {
          const groupX = CHART_PADDING.left + g * groupWidth + groupWidth / 2;
          const y = CHART_PADDING.top + chartH - (filteredStats[g].utilizationPercent / 100) * chartH;
          ctx.fillStyle = 'rgba(255,200,100,0.9)';
          ctx.beginPath();
          ctx.arc(groupX, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = 'rgba(255,200,100,0.7)';
        ctx.font = '9px system-ui, sans-serif';
        ctx.textAlign = 'left';
        const lastIdx = numGroups - 1;
        const lastX = CHART_PADDING.left + lastIdx * groupWidth + groupWidth / 2 + 6;
        const lastY = CHART_PADDING.top + chartH - (filteredStats[lastIdx].utilizationPercent / 100) * chartH;
        ctx.fillText(`${filteredStats[lastIdx].utilizationPercent}%`, lastX, lastY + 3);
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [canvasSize, filteredStats, maxMinutes, statsViewMode]);

  const handleGenerateRecommendations = () => {
    const recs = generateRecommendations(events, weeklyGoals, selectedDate);
    generateRec(recs);
  };

  const [goalInputs, setGoalInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    const inputs: Record<string, string> = {};
    for (const g of weeklyGoals) {
      inputs[g.category] = String(g.targetCount);
    }
    setGoalInputs(inputs);
  }, [weeklyGoals]);

  const updateGoal = (cat: EventCategory, val: string) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) return;
    setGoalInputs((prev) => ({ ...prev, [cat]: val }));
    const existing = weeklyGoals.find((g) => g.category === cat);
    if (existing) {
      setWeeklyGoals(weeklyGoals.map((g) => (g.category === cat ? { ...g, targetCount: num } : g)));
    } else {
      setWeeklyGoals([...weeklyGoals, { category: cat, targetCount: num }]);
    }
  };

  return (
    <div
      style={{
        padding: '16px',
        height: '100%',
        overflowY: 'auto',
        color: '#ddd',
        fontSize: '13px',
      }}
    >
      <h3
        style={{
          fontSize: '15px',
          fontWeight: 600,
          marginBottom: '12px',
          color: '#eee',
        }}
      >
        统计与趋势
      </h3>

      <div
        style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '12px',
        }}
      >
        {(['day', 'week', 'month'] as StatsViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setStatsViewMode(mode)}
            style={{
              padding: '4px 12px',
              border: 'none',
              borderRadius: '4px',
              background: statsViewMode === mode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
              color: statsViewMode === mode ? '#fff' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.2s',
            }}
          >
            {mode === 'day' ? '日' : mode === 'week' ? '周' : '月'}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <canvas ref={canvasRef} />
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        {CATEGORIES.map((cat) => (
          <div
            key={cat}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: CATEGORY_COLORS[cat],
              }}
            />
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>{CATEGORY_LABELS[cat]}</span>
          </div>
        ))}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
          }}
        >
          <div
            style={{
              width: '10px',
              height: '2px',
              background: 'rgba(255,200,100,0.7)',
            }}
          />
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>利用率</span>
        </div>
      </div>

      <h4
        style={{
          fontSize: '14px',
          fontWeight: 600,
          marginBottom: '10px',
          color: '#eee',
        }}
      >
        每周目标
      </h4>

      <div style={{ marginBottom: '12px' }}>
        {CATEGORIES.filter((c) => c !== 'other').map((cat) => (
          <div
            key={cat}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <span style={{ color: CATEGORY_COLORS[cat], fontSize: '12px' }}>
              {CATEGORY_LABELS[cat]}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>每周</span>
              <input
                type="number"
                min={0}
                max={7}
                value={goalInputs[cat] || ''}
                onChange={(e) => updateGoal(cat, e.target.value)}
                style={{
                  width: '36px',
                  padding: '2px 4px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '3px',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#ddd',
                  fontSize: '12px',
                  textAlign: 'center',
                }}
              />
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>次</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={handleGenerateRecommendations}
          style={{
            flex: 1,
            padding: '8px',
            border: 'none',
            borderRadius: '6px',
            background: 'rgba(107,143,113,0.4)',
            color: '#b0d4b5',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'background 0.2s',
          }}
        >
          生成推荐时间轴
        </button>
        {recommendedEvents.length > 0 && (
          <>
            <button
              onClick={confirmRecommendedEvents}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                borderRadius: '6px',
                background: 'rgba(74,111,165,0.4)',
                color: '#9ab4e0',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              确认推荐
            </button>
            <button
              onClick={clearRecommendedEvents}
              style={{
                padding: '8px 12px',
                border: 'none',
                borderRadius: '6px',
                background: 'rgba(163,93,93,0.3)',
                color: '#d4a0a0',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              取消
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
