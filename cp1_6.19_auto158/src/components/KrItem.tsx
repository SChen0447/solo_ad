import { useState, useEffect, useMemo } from 'react';
import type { Kr } from '../types';
import { TEAM_MEMBERS } from '../types';

interface Props {
  kr: Kr;
  onUpdateKr: (krId: string, data: Partial<Kr>) => void;
  onOpenCheckin: (kr: Kr) => void;
  onOpenChart: (kr: Kr) => void;
}

export default function KrItem({ kr, onUpdateKr, onOpenCheckin, onOpenChart }: Props) {
  const [displayProgress, setDisplayProgress] = useState(kr.progress);
  const [isHovered, setIsHovered] = useState(false);
  const [localProgress, setLocalProgress] = useState(kr.progress);
  const [debounceTimer, setDebounceTimer] = useState<number | null>(null);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const from = displayProgress;
    const to = kr.progress;
    const duration = 500;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayProgress(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [kr.progress]);

  useEffect(() => {
    setLocalProgress(kr.progress);
  }, [kr.progress]);

  function handleProgressChange(v: number) {
    const snapped = Math.round(v / 5) * 5;
    const clamped = Math.max(0, Math.min(100, snapped));
    setLocalProgress(clamped);
    setDisplayProgress(clamped);
    if (debounceTimer) window.clearTimeout(debounceTimer);
    const t = window.setTimeout(() => {
      onUpdateKr(kr.id, { progress: clamped });
    }, 400);
    setDebounceTimer(t);
  }

  const daysRemaining = useMemo(() => {
    const due = new Date(kr.dueDate).getTime();
    const now = Date.now();
    return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  }, [kr.dueDate]);

  const avatarColor = getAvatarColor(kr.owner);
  const initials = kr.owner.slice(0, 1);

  return (
    <div
      className="kr-item"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="kr-top-row">
        <div className="kr-desc">
          <span className="kr-desc-text">{kr.description}</span>
        </div>
        <div className="kr-actions">
          <button
            className="kr-action-btn"
            title="查看趋势图"
            onClick={() => onOpenChart(kr)}
          >
            📈
          </button>
          <button
            className="kr-action-btn"
            title="每周复盘"
            onClick={() => onOpenCheckin(kr)}
          >
            📝
          </button>
        </div>
      </div>

      <div className="kr-meta-row">
        <div className="kr-owner-info">
          <div className="kr-avatar" style={{ backgroundColor: avatarColor }}>
            {initials}
          </div>
          <div className="kr-owner-details">
            <select
              className="kr-owner-select"
              value={kr.owner}
              onChange={(e) => onUpdateKr(kr.id, { owner: e.target.value })}
            >
              {TEAM_MEMBERS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <div className="kr-due-date">
              <input
                type="date"
                className="kr-date-input"
                value={kr.dueDate}
                onChange={(e) => onUpdateKr(kr.id, { dueDate: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="kr-progress-display">
          <div className={`kr-progress-num ${isHovered ? 'highlight' : ''}`}>
            {displayProgress}%
          </div>
          <div className="kr-days-remaining">
            {daysRemaining > 0 ? `剩余 ${daysRemaining} 天` : daysRemaining === 0 ? '今天截止' : `已超期 ${-daysRemaining} 天`}
          </div>
        </div>
      </div>

      <div className="kr-progress-wrap">
        <div
          className={`kr-progress-bar ${isHovered ? 'hovered' : ''}`}
          title={isHovered ? `完成度 ${displayProgress}%，剩余 ${daysRemaining > 0 ? daysRemaining : 0} 天` : ''}
        >
          <div
            className="kr-progress-fill"
            style={{
              width: `${displayProgress}%`,
              background: `linear-gradient(90deg, #ef5350 0%, #ffb74d 50%, #66bb6a 100%)`,
            }}
          />
        </div>
      </div>

      <div className="kr-slider-wrap">
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={localProgress}
          onChange={(e) => handleProgressChange(Number(e.target.value))}
          className="kr-slider"
        />
        <div className="kr-slider-labels">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

const COLORS = [
  '#5c6bc0', '#26a69a', '#ef5350', '#ffa726',
  '#66bb6a', '#42a5f5', '#ab47bc', '#26c6da',
  '#ec407a', '#8d6e63', '#78909c',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}
