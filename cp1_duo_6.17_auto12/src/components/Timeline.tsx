import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DiaryEntry, MonthGroup } from '../types';
import { DiaryCard } from './DiaryCard';

interface TimelineProps {
  entries: DiaryEntry[];
  onLoadMore?: (year: number, month: number) => void;
  loading?: boolean;
  onSearch?: (keyword: string) => void;
}

const monthNames = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
];

const getMonthColor = (month: number): string => {
  const s = { r: 26, g: 35, b: 126 };
  const e = { r: 66, g: 165, b: 245 };
  const t = (month - 1) / 11;
  const r = Math.round(s.r + (e.r - s.r) * t);
  const g = Math.round(s.g + (e.g - s.g) * t);
  const b = Math.round(s.b + (e.b - s.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
};

const groupByMonth = (entries: DiaryEntry[]): MonthGroup[] => {
  const groups: Map<string, MonthGroup> = new Map();
  entries.forEach(entry => {
    const d = new Date(entry.date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const key = `${year}-${month}`;
    if (!groups.has(key)) groups.set(key, { year, month, entries: [] });
    groups.get(key)!.entries.push(entry);
  });
  return Array.from(groups.values())
    .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month))
    .map(g => ({ ...g, entries: g.entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }));
};

const EST_CARD_H = 200;
const EST_HEADER_H = 80;
const EST_GAP = 16;
const EST_MONTH_PAD = 32;

const estimateGroupH = (g: MonthGroup) =>
  EST_HEADER_H + g.entries.length * (EST_CARD_H + EST_GAP) + EST_MONTH_PAD;

export const Timeline: React.FC<TimelineProps> = ({ entries, onLoadMore, loading = false, onSearch }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewH, setViewH] = useState(0);
  const rafRef = useRef<number>();
  const [searchVal, setSearchVal] = useState('');

  const groups = useMemo(() => groupByMonth(entries), [entries]);

  const positions = useMemo(() => {
    let top = 0;
    return groups.map((g, i) => {
      const h = estimateGroupH(g);
      const pos = { top, h, i };
      top += h;
      return pos;
    });
  }, [groups]);

  const totalH = positions.length ? positions[positions.length - 1].top + positions[positions.length - 1].h : 0;

  const visible = useMemo(() => {
    const vTop = scrollTop;
    const vBot = scrollTop + viewH;
    let start = 0;
    let end = groups.length - 1;
    for (let i = 0; i < positions.length; i++) {
      if (positions[i].top + positions[i].h >= vTop) { start = Math.max(0, i - 2); break; }
    }
    for (let i = start; i < positions.length; i++) {
      if (positions[i].top > vBot) { end = Math.min(groups.length - 1, i + 2); break; }
    }
    return { start, end };
  }, [scrollTop, viewH, positions, groups.length]);

  const onScroll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (containerRef.current) setScrollTop(containerRef.current.scrollTop);
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setViewH(el.clientHeight);
    update();
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('resize', update); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  useEffect(() => {
    if (!positions.length || !onLoadMore || loading) return;
    const last = positions[positions.length - 1];
    if (last.top + last.h < scrollTop + viewH * 2.5) {
      const lg = groups[groups.length - 1];
      let ny = lg.year, nm = lg.month - 1;
      if (nm < 1) { nm = 12; ny--; }
      onLoadMore(ny, nm);
    }
  }, [scrollTop, viewH, positions, groups, loading, onLoadMore]);

  const handleSearch = (val: string) => {
    setSearchVal(val);
    onSearch?.(val);
  };

  const scrollToMonth = (year: number, month: number) => {
    const idx = groups.findIndex(g => g.year === year && g.month === month);
    if (idx >= 0 && containerRef.current) {
      containerRef.current.scrollTo({ top: positions[idx].top, behavior: 'smooth' });
    }
  };

  const visibleGroups = groups.slice(visible.start, visible.end + 1);

  return (
    <div className="timeline-wrapper">
      <div className="timeline-nav-bar">
        <div className="timeline-nav-title">月份导航</div>
        <div className="timeline-month-chips">
          {groups.map(g => (
            <button
              key={`${g.year}-${g.month}`}
              className="timeline-month-chip"
              style={{ color: getMonthColor(g.month), borderColor: getMonthColor(g.month) + '40' }}
              onClick={() => scrollToMonth(g.year, g.month)}
            >
              {g.month}月
            </button>
          ))}
        </div>
        <div className="timeline-nav-search">
          <input
            type="text"
            value={searchVal}
            onChange={e => handleSearch(e.target.value)}
            placeholder="回忆搜索..."
            className="timeline-search-input"
          />
        </div>
      </div>

      <div
        ref={containerRef}
        className="timeline-scroll-container"
        onScroll={onScroll}
      >
        <div className="timeline-content" style={{ height: totalH, position: 'relative' }}>
          {visibleGroups.map((group) => {
            const idx = groups.indexOf(group);
            const pos = positions[idx];
            return (
              <div
                key={`${group.year}-${group.month}`}
                className="timeline-month-group"
                style={{ position: 'absolute', top: pos.top, left: 0, right: 0 }}
              >
                <h2 className="timeline-month-header" style={{ color: getMonthColor(group.month) }}>
                  {group.year}年 {monthNames[group.month - 1]}
                </h2>
                <div>
                  {group.entries.map(entry => <DiaryCard key={entry.id} entry={entry} />)}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="timeline-loading">
              <div className="timeline-spinner" />
              <span>加载中...</span>
            </div>
          )}

          {entries.length === 0 && !loading && (
            <div className="timeline-empty">
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎵</div>
              <h3 style={{ fontSize: '20px', marginBottom: '10px', color: '#888' }}>还没有日记</h3>
              <p style={{ fontSize: '14px' }}>点击右下角的按钮开始记录你的音乐时光吧！</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .timeline-wrapper {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 80px);
        }

        .timeline-nav-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 20px;
          background: rgba(18, 18, 18, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          flex-shrink: 0;
          overflow-x: auto;
        }

        .timeline-nav-title {
          color: #888;
          font-size: 12px;
          white-space: nowrap;
        }

        .timeline-month-chips {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }

        .timeline-month-chip {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 4px 12px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .timeline-month-chip:hover {
          background: rgba(100, 181, 246, 0.15);
        }

        .timeline-nav-search {
          margin-left: auto;
          flex-shrink: 0;
        }

        .timeline-search-input {
          padding: 6px 14px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 16px;
          color: #E0E0E0;
          font-size: 13px;
          outline: none;
          backdrop-filter: blur(10px);
          transition: all 0.2s;
          width: 160px;
        }
        .timeline-search-input:focus {
          border-color: #64B5F6;
          box-shadow: 0 0 0 3px rgba(100, 181, 246, 0.2);
        }
        .timeline-search-input::placeholder { color: #555; }

        .timeline-scroll-container {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 20px;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }
        .timeline-scroll-container::-webkit-scrollbar { width: 6px; }
        .timeline-scroll-container::-webkit-scrollbar-track { background: #1A1A1A; }
        .timeline-scroll-container::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

        .timeline-content {
          max-width: 800px;
          margin: 0 auto;
        }

        .timeline-month-group {
          animation: fadeSlideIn 0.3s ease-out;
        }

        .timeline-month-header {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 20px;
          padding: 10px 0;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
          position: sticky;
          top: 0;
          background: rgba(18, 18, 18, 0.95);
          backdrop-filter: blur(8px);
          z-index: 10;
        }

        .timeline-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 40px;
          color: #888;
        }

        .timeline-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid #333;
          border-top-color: #64B5F6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 12px;
        }

        .timeline-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          color: #666;
          text-align: center;
        }

        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .timeline-scroll-container { padding: 10px; }
          .timeline-wrapper { height: calc(100vh - 140px); }
          .timeline-month-header { font-size: 24px; }
          .timeline-nav-search { display: none; }
        }
      `}</style>
    </div>
  );
};
