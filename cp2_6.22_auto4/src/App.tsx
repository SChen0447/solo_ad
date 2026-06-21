import { useState, useEffect, useMemo } from 'react';
import DiaryInput from './components/DiaryInput';
import Timeline from './components/Timeline';
import {
  formatDate,
  parseDate,
  generateCalendarGrid,
  getLast7Days,
  getMonthName,
  getWeekDayName,
  addMonths,
} from './utils/calendarHelper';
import type { Keyword } from './utils/moodAnalyzer';

export interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  moodColor: string;
  keywords: Keyword[];
  moodName: string;
  createdAt: number;
}

type ViewMode = 'day' | 'week';

const STORAGE_KEY = 'mood-diary-entries-v1';

function generateId(): string {
  return `diary_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createInitialMockEntries(): DiaryEntry[] {
  const today = new Date();
  const mockData = [
    {
      offset: 0,
      content: '今天完成了一个很有趣的项目，团队配合默契，领导也表扬了我们。下班后和朋友一起吃了顿火锅，聊得很开心，觉得生活充实又美好。明天继续加油！',
      moodName: '开心',
      moodColor: '#A7F3D0',
      keywords: [
        { text: '开心', weight: 1 },
        { text: '完成', weight: 0.85 },
        { text: '表扬', weight: 0.75 },
        { text: '火锅', weight: 0.6 },
        { text: '朋友', weight: 0.55 },
        { text: '美好', weight: 0.5 },
      ],
    },
    {
      offset: 1,
      content: '下午在公园散步了一圈，阳光正好，微风不燥。坐在长椅上看了会儿书，听听鸟叫，心情很平静。生活需要这样的慢节奏。',
      moodName: '平静',
      moodColor: '#BFDBFE',
      keywords: [
        { text: '平静', weight: 1 },
        { text: '散步', weight: 0.8 },
        { text: '阳光', weight: 0.7 },
        { text: '看书', weight: 0.6 },
        { text: '慢节奏', weight: 0.55 },
        { text: '公园', weight: 0.5 },
      ],
    },
    {
      offset: 2,
      content: '有点焦虑，最近项目进度有点赶，担心自己做不好。晚上失眠了，翻来覆去想事情。深呼吸，告诉自己一步一步来，会好的。',
      moodName: '焦虑',
      moodColor: '#FECACA',
      keywords: [
        { text: '焦虑', weight: 1 },
        { text: '担心', weight: 0.85 },
        { text: '失眠', weight: 0.75 },
        { text: '进度', weight: 0.6 },
        { text: '深呼吸', weight: 0.5 },
        { text: '赶', weight: 0.45 },
      ],
    },
    {
      offset: 3,
      content: '收到了一个意外的礼物，是一直想买的那本书。下午喝着咖啡看了几章，沉浸其中的感觉真好，很幸福满足的一天。',
      moodName: '欢快',
      moodColor: '#FDE68A',
      keywords: [
        { text: '礼物', weight: 1 },
        { text: '幸福', weight: 0.85 },
        { text: '咖啡', weight: 0.7 },
        { text: '书', weight: 0.65 },
        { text: '惊喜', weight: 0.6 },
        { text: '满足', weight: 0.55 },
      ],
    },
    {
      offset: 4,
      content: '普通的一天，正常上班，处理日常事务。没什么特别的事情发生，平平淡淡，也挺好的。晚上追了会儿剧就睡了。',
      moodName: '平淡',
      moodColor: '#E5E7EB',
      keywords: [
        { text: '日常', weight: 0.9 },
        { text: '普通', weight: 0.8 },
        { text: '上班', weight: 0.65 },
        { text: '追剧', weight: 0.5 },
        { text: '平淡', weight: 0.5 },
      ],
    },
    {
      offset: 5,
      content: '有点难过，和好朋友闹了点别扭。明明是小事，但心里还是有点不舒服。希望明天能和好，珍惜身边的人。',
      moodName: '忧伤',
      moodColor: '#DDD6FE',
      keywords: [
        { text: '难过', weight: 1 },
        { text: '别扭', weight: 0.8 },
        { text: '不舒服', weight: 0.7 },
        { text: '朋友', weight: 0.6 },
        { text: '珍惜', weight: 0.55 },
      ],
    },
    {
      offset: 6,
      content: '今天真的很烦躁，电脑突然坏了，文件还没备份。耽误了大半天的工作进度，越想越气。晚上早点睡，希望明天一切顺利。',
      moodName: '烦躁',
      moodColor: '#FCA5A5',
      keywords: [
        { text: '烦躁', weight: 1 },
        { text: '电脑', weight: 0.8 },
        { text: '气', weight: 0.75 },
        { text: '坏了', weight: 0.7 },
        { text: '耽误', weight: 0.6 },
        { text: '顺利', weight: 0.45 },
      ],
    },
  ];

  return mockData.map((d, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - d.offset);
    return {
      id: `mock_${i}_${Date.now()}`,
      date: formatDate(date),
      content: d.content,
      moodName: d.moodName,
      moodColor: d.moodColor,
      keywords: d.keywords,
      createdAt: date.getTime() + i,
    };
  });
}

function MoodBar({
  entries,
  viewMode,
  baseDate,
}: {
  entries: DiaryEntry[];
  viewMode: ViewMode;
  baseDate: Date;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const last7Days = useMemo(() => getLast7Days(baseDate), [baseDate]);
  const entryMap = useMemo(() => {
    const m = new Map<string, DiaryEntry>();
    entries.forEach(e => m.set(e.date, e));
    return m;
  }, [entries]);

  const blocks = last7Days.map(date => {
    const key = formatDate(date);
    return {
      date,
      dateKey: key,
      entry: entryMap.get(key),
      weekday: getWeekDayName(date.getDay()),
      dayNum: date.getDate(),
    };
  });

  const colors = blocks.map(b => b.entry?.moodColor || '#F3F4F6');

  const curvePath = useMemo(() => {
    const blockW = 40;
    const gap = 4;
    const totalStep = blockW + gap;
    const topY = 20;
    const amp = 18;

    if (blocks.length < 2) return '';
    const pts = blocks.map((_, i) => {
      const x = i * totalStep + blockW / 2;
      const y = topY + (i % 2 === 0 ? -amp : amp);
      return { x, y };
    });

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpx1 = prev.x + totalStep * 0.4;
      const cpx2 = curr.x - totalStep * 0.4;
      path += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return path;
  }, [blocks]);

  const totalW = 7 * 40 + 6 * 4;

  return (
    <div className="mood-bar-container">
      <div className="mood-bar-header">
        <span className="mood-bar-title">心情色彩条</span>
        <div className="mood-bar-view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => {}}
          >
            日
          </button>
          <button
            className={`toggle-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => {}}
          >
            周
          </button>
        </div>
      </div>

      <div className="mood-bar-wrapper">
        {viewMode === 'week' && (
          <svg
            className="mood-curve-svg"
            width={totalW}
            height={60}
            viewBox={`0 0 ${totalW} 60`}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {blocks.slice(0, -1).map((_, i) => {
                const id = `grad-${i}`;
                return (
                  <linearGradient key={id} id={id} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors[i]} />
                    <stop offset="100%" stopColor={colors[i + 1]} />
                  </linearGradient>
                );
              })}
            </defs>
            {curvePath && blocks.slice(0, -1).map((_, i) => {
              const blockW = 40;
              const gap = 4;
              const totalStep = blockW + gap;
              const xStart = i * totalStep;
              const xEnd = (i + 1) * totalStep;
              return (
                <path
                  key={i}
                  d={curvePath}
                  fill="none"
                  stroke={`url(#grad-${i})`}
                  strokeWidth={3}
                  strokeLinecap="round"
                  className="curve-segment"
                  style={{
                    strokeDasharray: curvePath.length,
                    strokeDashoffset: curvePath.length,
                    clipPath: `inset(0 ${totalW - xEnd}px 0 ${xStart}px)`,
                    animationDelay: `${i * 0.18}s`,
                  }}
                />
              );
            })}
          </svg>
        )}

        <div className="mood-blocks-row">
          {blocks.map((b, i) => (
            <div
              key={b.dateKey}
              className="mood-block-wrapper"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              {hoverIndex === i && b.entry && (
                <div className="mood-tooltip">
                  <div className="tooltip-date">{b.dateKey}</div>
                  <div className="tooltip-mood" style={{ color: adjustTextColor(b.moodColor) }}>
                    <span
                      className="tooltip-dot"
                      style={{ background: b.moodColor }}
                    />
                    {b.moodName}
                  </div>
                  <div className="tooltip-kw">
                    {b.entry.keywords.slice(0, 3).map(k => k.text).join(' · ')}
                  </div>
                </div>
              )}
              <div
                className="mood-block"
                style={{
                  background: b.entry ? b.moodColor : '#F3F4F6',
                  border: b.entry ? 'none' : '2px dashed #D1D5DB',
                }}
              />
              <div className="block-weekday">{b.weekday}</div>
              <div className="block-daynum">{b.dayNum}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .mood-bar-container {
          background: #F9FAFB;
          border-radius: 20px;
          padding: 20px;
          border: 1px solid #E5E7EB;
        }
        .mood-bar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .mood-bar-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }
        .mood-bar-view-toggle {
          display: inline-flex;
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 2px;
          gap: 2px;
        }
        .toggle-btn {
          padding: 5px 14px;
          border: none;
          background: transparent;
          border-radius: 10px;
          font-size: 13px;
          color: #6B7280;
          cursor: pointer;
          transition: all 0.3s ease-out;
          font-weight: 500;
        }
        .toggle-btn.active {
          background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);
          color: #FFFFFF;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        }
        .mood-bar-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .mood-curve-svg {
          margin-bottom: 4px;
          display: block;
        }
        .curve-segment {
          animation: drawCurve 1.5s ease-out forwards;
        }
        @keyframes drawCurve {
          to {
            strokeDashoffset: 0;
          }
        }
        .mood-blocks-row {
          display: flex;
          gap: 4px;
          justify-content: center;
        }
        .mood-block-wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .mood-block {
          width: 40px;
          height: 80px;
          border-radius: 8px;
          transition: transform 0.3s ease-out, box-shadow 0.3s ease-out;
          cursor: pointer;
        }
        .mood-block-wrapper:hover .mood-block {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
        }
        .mood-tooltip {
          position: absolute;
          bottom: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%);
          background: #FFFFFF;
          border-radius: 8px;
          padding: 10px 12px;
          min-width: 140px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06);
          z-index: 10;
          white-space: nowrap;
          animation: fadeInTooltip 0.2s ease-out;
          border: 1px solid #E5E7EB;
        }
        .mood-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 6px solid transparent;
          border-top-color: #FFFFFF;
        }
        @keyframes fadeInTooltip {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        .tooltip-date {
          font-size: 11px;
          color: #9CA3AF;
          margin-bottom: 4px;
        }
        .tooltip-mood {
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }
        .tooltip-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .tooltip-kw {
          font-size: 11px;
          color: #6B7280;
        }
        .block-weekday {
          margin-top: 6px;
          font-size: 12px;
          color: #9CA3AF;
        }
        .block-daynum {
          font-size: 12px;
          color: #6B7280;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

function adjustTextColor(_bg: string): string {
  return '#374151';
}

function Calendar({
  currentMonth,
  entries,
  selectedDate,
  onSelectDate,
  onChangeMonth,
}: {
  currentMonth: { year: number; month: number };
  entries: DiaryEntry[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onChangeMonth: (year: number, month: number) => void;
}) {
  const [flipping, setFlipping] = useState<'left' | 'right' | null>(null);

  const grid = useMemo(
    () => generateCalendarGrid(currentMonth.year, currentMonth.month, entries),
    [currentMonth.year, currentMonth.month, entries]
  );

  const handlePrev = () => {
    setFlipping('left');
    setTimeout(() => {
      const next = addMonths(currentMonth.year, currentMonth.month, -1);
      onChangeMonth(next.year, next.month);
      setFlipping(null);
    }, 250);
  };

  const handleNext = () => {
    setFlipping('right');
    setTimeout(() => {
      const next = addMonths(currentMonth.year, currentMonth.month, 1);
      onChangeMonth(next.year, next.month);
      setFlipping(null);
    }, 250);
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button className="cal-nav-btn" onClick={handlePrev}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span className="cal-title">
          {currentMonth.year}年 {getMonthName(currentMonth.month)}
        </span>
        <button className="cal-nav-btn" onClick={handleNext}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
      <div className="calendar-weekdays">
        {['日', '一', '二', '三', '四', '五', '六'].map((d, i) => (
          <div
            key={d}
            className={`cal-weekday ${i === 0 || i === 6 ? 'weekend' : ''}`}
          >
            {d}
          </div>
        ))}
      </div>
      <div
        className="calendar-grid"
        style={{
          transform: flipping === 'left' ? 'scaleX(0.05)' : flipping === 'right' ? 'scaleX(0.05)' : 'scaleX(1)',
          opacity: flipping ? 0.5 : 1,
        }}
      >
        {grid.flat().map((day) => {
          const isSelected = day.dateKey === selectedDate;
          return (
            <div
              key={day.dateKey}
              className={`cal-day ${!day.isCurrentMonth ? 'other-month' : ''}`}
              onClick={() => day.isCurrentMonth && onSelectDate(day.dateKey)}
            >
              <div
                className={`cal-day-inner ${day.isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                style={{
                  background: day.isToday ? '#EEF2FF' : isSelected ? 'linear-gradient(135deg,#8B5CF6,#6366F1)' : 'transparent',
                  color: isSelected ? '#FFFFFF' : day.isToday ? '#6366F1' : day.isCurrentMonth ? '#374151' : '#D1D5DB',
                  fontWeight: day.isToday || isSelected ? 700 : 400,
                }}
              >
                {day.date.getDate()}
                {day.isToday && !isSelected && (
                  <span className="today-ring" />
                )}
              </div>
              {day.hasEntry && (
                <span
                  className="entry-dot"
                  style={{ background: day.moodColor }}
                />
              )}
            </div>
          );
        })}
      </div>
      <style>{`
        .calendar-container {
          background: #FFFFFF;
          border-radius: 20px;
          padding: 20px;
          border: 1px solid #E5E7EB;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.06);
        }
        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .cal-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }
        .cal-nav-btn {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          border: none;
          background: #F3F4F6;
          color: #6B7280;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease-out;
        }
        .cal-nav-btn:hover {
          background: #6366F1;
          color: #FFFFFF;
          transform: scale(1.05);
        }
        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 8px;
        }
        .cal-weekday {
          text-align: center;
          font-size: 12px;
          color: #9CA3AF;
          padding: 6px 0;
          font-weight: 500;
        }
        .cal-weekday.weekend {
          color: #EF4444;
          opacity: 0.7;
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          transition: transform 0.5s ease-out, opacity 0.25s ease-out;
          transform-origin: center;
        }
        .cal-day {
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          cursor: pointer;
          border-radius: 10px;
          transition: background 0.3s ease-out;
        }
        .cal-day.other-month {
          cursor: default;
        }
        .cal-day:hover:not(.other-month) {
          background: #F3F4F6;
        }
        .cal-day-inner {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          position: relative;
          transition: all 0.3s ease-out;
        }
        .cal-day-inner.is-today {
          position: relative;
        }
        .today-ring {
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          border: 2px solid #6366F1;
          pointer-events: none;
        }
        .entry-dot {
          position: absolute;
          bottom: 3px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
}

export default function App() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setEntries(JSON.parse(raw));
      } else {
        const initial = createInitialMockEntries();
        setEntries(initial);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      }
    } catch {
      const initial = createInitialMockEntries();
      setEntries(initial);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }
  }, [entries, loaded]);

  const handleSave = (e: { date: string; content: string; moodColor: string; keywords: Keyword[]; moodName: string }) => {
    setEntries(prev => {
      const existingIdx = prev.findIndex(p => p.date === e.date);
      const base: DiaryEntry = {
        id: generateId(),
        date: e.date,
        content: e.content,
        moodColor: e.moodColor,
        keywords: e.keywords,
        moodName: e.moodName,
        createdAt: Date.now(),
      };
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = { ...base, id: prev[existingIdx].id, createdAt: prev[existingIdx].createdAt };
        return copy;
      }
      return [...prev, base];
    });
  };

  const selectedEntry = entries.find(e => e.date === selectedDate);

  if (!loaded) return null;

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-logo">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V10"/>
              <path d="M18 20V4"/>
              <path d="M6 20v-6"/>
            </svg>
          </div>
          <div>
            <h1 className="app-title">心情日记</h1>
            <p className="app-subtitle">时间线 · 色彩分析</p>
          </div>
        </div>
      </header>

      <main className="app-main">
        <aside className="column column-left">
          <Calendar
            currentMonth={currentMonth}
            entries={entries}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onChangeMonth={(y, m) => setCurrentMonth({ year: y, month: m })}
          />
        </aside>

        <section className="column column-center">
          <DiaryInput
            date={selectedDate}
            onSave={handleSave}
            initialContent={selectedEntry?.content}
          />
        </section>

        <aside className="column column-right">
          <Timeline entries={entries} onSelectDate={setSelectedDate} />
          <div className="view-mode-switch" style={{ marginTop: 20 }}>
            <MoodBar
              entries={entries}
              viewMode={viewMode}
              baseDate={parseDate(selectedDate)}
            />
            <div className="mode-toggle-row" style={{ marginTop: 12 }}>
              <button
                className={`mode-btn ${viewMode === 'day' ? 'active' : ''}`}
                onClick={() => setViewMode('day')}
              >
                日视图
              </button>
              <button
                className={`mode-btn ${viewMode === 'week' ? 'active' : ''}`}
                onClick={() => setViewMode('week')}
              >
                周视图曲线
              </button>
            </div>
          </div>
        </aside>
      </main>

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root {
          margin: 0;
          padding: 0;
          min-height: 100vh;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
            'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .app-root {
          min-height: 100vh;
          background: #F3F4F6;
          padding: 24px;
          padding-bottom: 48px;
        }
        .app-header {
          max-width: 1400px;
          margin: 0 auto 24px;
        }
        .app-logo {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .logo-icon {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
        }
        .app-title {
          font-size: 22px;
          font-weight: 700;
          color: #111827;
          margin: 0;
          line-height: 1.2;
        }
        .app-subtitle {
          font-size: 13px;
          color: #9CA3AF;
          margin: 2px 0 0;
        }
        .app-main {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 300px 1fr 340px;
          gap: 24px;
          align-items: start;
        }
        .column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .column-right {
          position: sticky;
          top: 24px;
          max-height: calc(100vh - 100px);
          overflow-y: auto;
          padding-right: 4px;
        }
        .column-right::-webkit-scrollbar {
          width: 6px;
        }
        .column-right::-webkit-scrollbar-thumb {
          background: #E5E7EB;
          border-radius: 3px;
        }
        .view-mode-switch {
          width: 100%;
        }
        .mode-toggle-row {
          display: flex;
          gap: 8px;
          justify-content: center;
        }
        .mode-btn {
          flex: 1;
          padding: 8px 16px;
          border: 1px solid #E5E7EB;
          background: #FFFFFF;
          border-radius: 12px;
          font-size: 13px;
          color: #6B7280;
          cursor: pointer;
          transition: all 0.3s ease-out;
          font-weight: 500;
        }
        .mode-btn:hover {
          border-color: #C7D2FE;
          color: #6366F1;
        }
        .mode-btn.active {
          background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);
          color: #FFFFFF;
          border-color: transparent;
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
        }

        @media (max-width: 1100px) {
          .app-main {
            grid-template-columns: 280px 1fr;
          }
          .column-right {
            grid-column: 1 / -1;
            position: static;
            max-height: none;
            overflow: visible;
          }
        }
        @media (max-width: 768px) {
          .app-root {
            padding: 16px;
          }
          .app-main {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .column-left,
          .column-center,
          .column-right {
            width: 100%;
          }
        }
        @media (max-width: 480px) {
          .app-root {
            padding: 12px;
          }
          .app-title {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
}
