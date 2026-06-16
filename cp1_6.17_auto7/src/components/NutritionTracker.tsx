import { useMemo } from 'react';
import type { DailyTracker } from '../types';
import { exportTrackerCSV } from '../services/api';

interface NutritionGoals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface NutritionTrackerProps {
  tracker: DailyTracker | null;
  goals: NutritionGoals;
  onRefresh: () => Promise<void>;
  onClear: () => Promise<void>;
}

interface RingSegment {
  name: string;
  value: number;
  color: string;
}

function DonutChart({ protein, fat, carbs }: { protein: number; fat: number; carbs: number }) {
  const total = protein + fat + carbs;
  const segments: RingSegment[] = [
    { name: '蛋白质', value: protein, color: '#3B82F6' },
    { name: '脂肪', value: fat, color: '#F59E0B' },
    { name: '碳水', value: carbs, color: '#10B981' }
  ];

  const size = 200;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;

  const dashArray = (segment: RingSegment) => {
    if (total === 0) return '0 999';
    const proportion = segment.value / total;
    const dashLength = proportion * circumference;
    const dashGap = circumference - dashLength;
    return `${dashLength} ${dashGap}`;
  };

  const dashOffset = () => {
    const offset = circumference - cumulativeOffset;
    return offset;
  };

  return (
    <div className="donut-chart-container">
      <svg width={size} height={size} className="donut-svg" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F3F4F6"
          strokeWidth={strokeWidth}
        />
        {segments.map((seg) => {
          const currentOffset = cumulativeOffset;
          if (total > 0) {
            cumulativeOffset += (seg.value / total) * circumference;
          }
          const offset = circumference - currentOffset;
          return (
            <circle
              key={seg.name}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray(seg)}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="donut-segment"
            />
          );
        })}
        <text
          x="50%"
          y="45%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="donut-total-label"
        >
          {total > 0 ? `${total.toFixed(0)}g` : '—'}
        </text>
        <text
          x="50%"
          y="58%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="donut-total-sub"
        >
          总摄入
        </text>
      </svg>

      <div className="donut-legend">
        {segments.map((seg) => {
          const percent = total > 0 ? ((seg.value / total) * 100).toFixed(0) : '0';
          return (
            <div key={seg.name} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: seg.color }}></span>
              <span className="legend-name">{seg.name}</span>
              <span className="legend-value">{seg.value.toFixed(0)}g</span>
              <span className="legend-percent">({percent}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProgressBar({
  label,
  current,
  goal,
  unit,
  color
}: {
  label: string;
  current: number;
  goal: number;
  unit: string;
  color: string;
}) {
  const percent = Math.min(100, (current / goal) * 100);
  const isOver = current > goal;

  return (
    <div className="progress-item">
      <div className="progress-header">
        <span className="progress-label">
          <span className="progress-dot" style={{ backgroundColor: color }}></span>
          {label}
        </span>
        <span className="progress-numbers">
          <span className={isOver ? 'over-goal' : ''}>{current.toFixed(0)}</span>
          <span className="progress-sep">/</span>
          <span>{goal}{unit}</span>
        </span>
      </div>
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{
            width: `${percent}%`,
            background: `linear-gradient(90deg, ${color}, ${color}dd)`
          }}
        >
          <div className="progress-bar-shine"></div>
        </div>
      </div>
      <div className="progress-percent">{percent.toFixed(0)}%</div>
    </div>
  );
}

function NutritionTracker({ tracker, goals, onRefresh, onClear }: NutritionTrackerProps) {
  const calories = tracker?.calories ?? 0;
  const protein = tracker?.protein ?? 0;
  const fat = tracker?.fat ?? 0;
  const carbs = tracker?.carbs ?? 0;
  const recipes = tracker?.recipes ?? [];

  const handleExport = () => {
    window.location.href = exportTrackerCSV();
  };

  const todayDate = useMemo(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${month}月${day}日 ${weekdays[now.getDay()]}`;
  }, []);

  return (
    <div className="nutrition-tracker">
      <div className="tracker-card">
        <div className="tracker-header">
          <div>
            <h3 className="tracker-title">
              <span className="tracker-icon">📊</span>
              今日营养
            </h3>
            <p className="tracker-date">{todayDate}</p>
          </div>
          <button
            type="button"
            className="refresh-button"
            onClick={() => onRefresh()}
            title="刷新数据"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>

        <DonutChart protein={protein} fat={fat} carbs={carbs} />

        <div className="progress-section">
          <ProgressBar
            label="热量"
            current={calories}
            goal={goals.calories}
            unit="kcal"
            color="#FF8C42"
          />
        </div>

        <div className="progress-details">
          <ProgressBar
            label="蛋白质"
            current={protein}
            goal={goals.protein}
            unit="g"
            color="#3B82F6"
          />
          <ProgressBar
            label="脂肪"
            current={fat}
            goal={goals.fat}
            unit="g"
            color="#F59E0B"
          />
          <ProgressBar
            label="碳水化合物"
            current={carbs}
            goal={goals.carbs}
            unit="g"
            color="#10B981"
          />
        </div>

        {recipes.length > 0 && (
          <div className="recipes-log">
            <h4 className="log-title">
              <span>📝</span>
              今日记录 ({recipes.length})
            </h4>
            <div className="recipes-list">
              {recipes.slice(0, 5).map((r) => (
                <div key={r.id} className="recipe-log-item">
                  <span className="log-name" title={r.recipe_name}>{r.recipe_name}</span>
                  <span className="log-cal">{r.calories}kcal</span>
                </div>
              ))}
              {recipes.length > 5 && (
                <div className="log-more">还有 {recipes.length - 5} 条记录...</div>
              )}
            </div>
          </div>
        )}

        <div className="tracker-actions">
          <button
            type="button"
            className="action-button action-export"
            onClick={handleExport}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            导出CSV
          </button>
          <button
            type="button"
            className="action-button action-clear"
            onClick={() => onClear()}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            清空记录
          </button>
        </div>
      </div>
    </div>
  );
}

export default NutritionTracker;
