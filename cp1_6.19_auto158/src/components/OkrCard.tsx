import { useState, useEffect, useRef } from 'react';
import type { Okr, Kr } from '../types';
import { TEAM_MEMBERS } from '../types';
import KrItem from './KrItem';

interface Props {
  okr: Okr;
  onUpdateTitle: (title: string) => void;
  onAddKr: (data: { description: string; owner: string; dueDate: string }) => void;
  onUpdateKr: (krId: string, data: Partial<Kr>) => void;
  onOpenCheckin: (kr: Kr) => void;
  onOpenChart: (kr: Kr) => void;
}

export default function OkrCard({
  okr,
  onUpdateTitle,
  onAddKr,
  onUpdateKr,
  onOpenCheckin,
  onOpenChart,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(okr.title);
  const [showAddKr, setShowAddKr] = useState(false);
  const [newKr, setNewKr] = useState({
    description: '',
    owner: TEAM_MEMBERS[0],
    dueDate: getDefaultDueDate(),
  });
  const [displayProgress, setDisplayProgress] = useState(0);
  const [rotateAnimate, setRotateAnimate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalProgress =
    okr.krs.length === 0
      ? 0
      : Math.round(okr.krs.reduce((sum, k) => sum + k.progress, 0) / okr.krs.length);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const from = displayProgress;
    const to = totalProgress;
    const duration = 800;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayProgress(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [totalProgress]);

  useEffect(() => {
    setRotateAnimate(true);
    const t = setTimeout(() => setRotateAnimate(false), 600);
    return () => clearTimeout(t);
  }, [totalProgress]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function getDefaultDueDate(): string {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  }

  function handleTitleSave() {
    const v = titleValue.trim();
    if (v && v !== okr.title) onUpdateTitle(v);
    else setTitleValue(okr.title);
    setEditing(false);
  }

  function handleAddKrSubmit() {
    if (!newKr.description.trim()) return;
    onAddKr(newKr);
    setNewKr({ description: '', owner: TEAM_MEMBERS[0], dueDate: getDefaultDueDate() });
    setShowAddKr(false);
  }

  const progressColor = getProgressGradient(totalProgress);
  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference - (displayProgress / 100) * circumference;

  return (
    <div className="okr-card">
      <div className="okr-card-header">
        <div className="okr-title-area">
          <div className="okr-period-badge">{okr.period}</div>
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              className="okr-title-input"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') {
                  setTitleValue(okr.title);
                  setEditing(false);
                }
              }}
            />
          ) : (
            <h2
              className="okr-title"
              onClick={() => setEditing(true)}
              title="点击编辑标题"
            >
              {okr.title}
            </h2>
          )}
          <div className="okr-owner">负责人：{okr.owner}</div>
        </div>

        <div className="okr-progress-ring-wrap">
          <svg className="okr-progress-ring" width="96" height="96" viewBox="0 0 96 96">
            <defs>
              <linearGradient id={`grad-${okr.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef5350" />
                <stop offset="50%" stopColor="#ffb74d" />
                <stop offset="100%" stopColor="#66bb6a" />
              </linearGradient>
            </defs>
            <circle cx="48" cy="48" r="36" stroke="#e0e0e0" strokeWidth="8" fill="none" />
            <circle
              cx="48"
              cy="48"
              r="36"
              stroke={`url(#grad-${okr.id})`}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 48 48)"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
            />
          </svg>
          <div className={`okr-progress-text ${rotateAnimate ? 'rotate-in' : ''}`}>
            <span className="progress-num">{displayProgress}</span>
            <span className="progress-pct">%</span>
          </div>
        </div>
      </div>

      <div className="kr-list-wrap">
        {okr.krs.length === 0 ? (
          <div className="kr-empty">暂无关键结果，点击下方按钮添加第一个KR</div>
        ) : (
          <VirtualKrList
            krs={okr.krs}
            onUpdateKr={onUpdateKr}
            onOpenCheckin={onOpenCheckin}
            onOpenChart={onOpenChart}
          />
        )}
      </div>

      <div className="okr-card-footer">
        <div className={`add-kr-form-wrapper ${showAddKr ? 'expanded' : ''}`}>
          {showAddKr && (
            <div className="add-kr-form animate-collapse">
              <div className="form-group">
                <label>关键结果描述</label>
                <input
                  type="text"
                  placeholder="描述可衡量的关键结果..."
                  value={newKr.description}
                  onChange={(e) => setNewKr({ ...newKr, description: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddKrSubmit()}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>负责人</label>
                  <select
                    value={newKr.owner}
                    onChange={(e) => setNewKr({ ...newKr, owner: e.target.value })}
                  >
                    {TEAM_MEMBERS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>截止日期</label>
                  <input
                    type="date"
                    value={newKr.dueDate}
                    onChange={(e) => setNewKr({ ...newKr, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-sm btn-secondary" onClick={() => setShowAddKr(false)}>
                  取消
                </button>
                <button
                  className="btn btn-sm btn-primary ripple-btn"
                  onClick={handleAddKrSubmit}
                  disabled={!newKr.description.trim()}
                >
                  添加 KR
                </button>
              </div>
            </div>
          )}
        </div>

        {!showAddKr && (
          <button
            className="btn-add-kr ripple-btn"
            onClick={() => setShowAddKr(true)}
          >
            <span className="add-kr-icon">+</span>
            添加关键结果 (KR)
          </button>
        )}
      </div>
    </div>
  );
}

function getProgressGradient(p: number): string {
  if (p < 33) return '#ef5350';
  if (p < 66) return '#ffb74d';
  return '#66bb6a';
}

interface VirtualListProps {
  krs: Kr[];
  onUpdateKr: (krId: string, data: Partial<Kr>) => void;
  onOpenCheckin: (kr: Kr) => void;
  onOpenChart: (kr: Kr) => void;
}

function VirtualKrList({ krs, onUpdateKr, onOpenCheckin, onOpenChart }: VirtualListProps) {
  const ITEM_HEIGHT = 180;
  const BUFFER = 3;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setHeight(e.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sortedKrs = [...krs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const totalHeight = sortedKrs.length * ITEM_HEIGHT;
  const startIdx = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
  const endIdx = Math.min(
    sortedKrs.length,
    Math.ceil((scrollTop + height) / ITEM_HEIGHT) + BUFFER
  );
  const visibleKrs = sortedKrs.slice(startIdx, endIdx);
  const offsetY = startIdx * ITEM_HEIGHT;

  return (
    <div
      ref={containerRef}
      className="kr-list-container"
      onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      style={{ maxHeight: sortedKrs.length > 4 ? 600 : sortedKrs.length * ITEM_HEIGHT + 10 }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleKrs.map((kr, idx) => (
            <div
              key={kr.id}
              style={{ height: ITEM_HEIGHT, marginBottom: 8 }}
              className={`kr-item-wrapper ${(startIdx + idx) % 2 === 1 ? 'alt-row' : ''}`}
            >
              <KrItem
                kr={kr}
                onUpdateKr={onUpdateKr}
                onOpenCheckin={onOpenCheckin}
                onOpenChart={onOpenChart}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
