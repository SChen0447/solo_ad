import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { EMOTIONS, DayRecord } from '../types';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const formatDate = (year: number, month: number, day: number): string => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const MoodCalendar: React.FC = () => {
  const { getMonthRecords, getDayRecord } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tooltip, setTooltip] = useState<{ record: DayRecord; x: number; y: number } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthRecords = getMonthRecords(year, month);

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleCellHover = (day: number, e: React.MouseEvent) => {
    const dateStr = formatDate(year, month, day);
    const record = getDayRecord(dateStr);
    if (record) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setTooltip({
        record,
        x: rect.left + rect.width + 10,
        y: rect.top,
      });
    }
  };

  const handleCellLeave = () => {
    setTooltip(null);
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  const emotionStats: Record<string, number> = {};
  Object.values(monthRecords).forEach(r => {
    if (r.emotion) {
      emotionStats[r.emotion.emotion] = (emotionStats[r.emotion.emotion] || 0) + 1;
    }
  });

  return (
    <div className="calendar-container">
      <h1 className="page-title">月度情绪色谱地图</h1>

      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={prevMonth}>‹</button>
        <div className="calendar-title">{year}年 {month + 1}月</div>
        <button className="calendar-nav-btn" onClick={nextMonth}>›</button>
      </div>

      {Object.keys(emotionStats).length > 0 && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '8px' }}>
          {Object.entries(emotionStats).map(([type, count]) => {
            const e = EMOTIONS.find(em => em.type === type);
            return (
              <div
                key={type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  backgroundColor: '#252539',
                  borderRadius: '12px',
                  fontSize: '13px',
                }}
              >
                {e?.emoji} <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: e?.color }} /> {count}天
              </div>
            );
          })}
        </div>
      )}

      <div className="weekday-row">
        {WEEKDAYS.map(w => (
          <div key={w} className="weekday-cell">{w}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={idx} className="calendar-cell empty" />;
          }
          const dateStr = formatDate(year, month, day);
          const record = monthRecords[dateStr];
          const bgColor = record?.emotion?.emotionColor || '#252539';
          const isToday = isCurrentMonth && today.getDate() === day;
          return (
            <div
              key={idx}
              className={`calendar-cell ${isToday ? 'today' : ''}`}
              style={{ backgroundColor: bgColor, borderColor: record?.emotion ? 'transparent' : '#33334D' }}
              onMouseEnter={(e) => handleCellHover(day, e)}
              onMouseLeave={handleCellLeave}
            >
              <span className="day-num">{day}</span>
              {record?.challenge?.score === 10 && (
                <span style={{ position: 'absolute', right: '6px', bottom: '4px', fontSize: '12px' }}>⭐</span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px', color: '#8888AA' }}>
        <span>⭐ = 挑战成功</span>
        <span>|</span>
        <span>悬停格子查看详情</span>
      </div>

      {tooltip && (
        <div
          className="tooltip-card"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="tooltip-date">{tooltip.record.date}</div>
          {tooltip.record.emotion && (
            <div className="tooltip-row">
              <span style={{ fontSize: '18px' }}>{EMOTIONS.find(e => e.type === tooltip.record.emotion?.emotion)?.emoji}</span>
              <span>情绪: {EMOTIONS.find(e => e.type === tooltip.record.emotion?.emotion)?.label}</span>
              <span className="tooltip-color-swatch" style={{ backgroundColor: tooltip.record.emotion.emotionColor }} />
            </div>
          )}
          {tooltip.record.challenge && (
            <>
              <div className="tooltip-row">
                得分: <strong style={{ color: tooltip.record.challenge.score === 10 ? '#00FF88' : '#FF4757' }}>{tooltip.record.challenge.score}分</strong>
              </div>
              <div className="tooltip-row">
                用时: {tooltip.record.challenge.timeSpent.toFixed(1)}秒
              </div>
              <div className="tooltip-row">
                <span>主题色:</span>
                <span className="tooltip-color-swatch" style={{ backgroundColor: tooltip.record.challenge.themeColor }} />
                <span style={{ fontFamily: 'monospace' }}>{tooltip.record.challenge.themeColor}</span>
              </div>
              <div className="tooltip-row" style={{ fontSize: '12px', color: '#8888AA' }}>
                方案: {tooltip.record.challenge.schemeName}
              </div>
            </>
          )}
          {!tooltip.record.emotion && !tooltip.record.challenge && (
            <div style={{ color: '#8888AA', fontSize: '13px' }}>无记录</div>
          )}
        </div>
      )}
    </div>
  );
};

export default MoodCalendar;
