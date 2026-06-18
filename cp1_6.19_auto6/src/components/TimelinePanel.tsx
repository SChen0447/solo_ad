import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { useStore, MOOD_COLORS, DiaryEntry } from '../store';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TimelinePanel: React.FC = () => {
  const currentView = useStore((s) => s.currentView);
  const entries = useStore((s) => s.entries);
  const selectedDate = useStore((s) => s.selectedDate);
  const setSelectedDate = useStore((s) => s.setSelectedDate);

  const [viewKey, setViewKey] = useState(0);
  const [cursorDate, setCursorDate] = useState(dayjs(selectedDate));

  useEffect(() => {
    setViewKey((k) => k + 1);
  }, [currentView]);

  useEffect(() => {
    setCursorDate(dayjs(selectedDate));
  }, [selectedDate]);

  const today = dayjs().format('YYYY-MM-DD');

  const entriesByDate: Record<string, DiaryEntry[]> = entries.reduce((acc, e) => {
    if (!acc[e.date]) acc[e.date] = [];
    acc[e.date].push(e);
    return acc;
  }, {} as Record<string, DiaryEntry[]>);

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
  };

  const goPrev = () => {
    setCursorDate((d) =>
      currentView === 'week' ? d.subtract(1, 'week') : d.subtract(1, 'month')
    );
  };

  const goNext = () => {
    setCursorDate((d) =>
      currentView === 'week' ? d.add(1, 'week') : d.add(1, 'month')
    );
  };

  const goToday = () => {
    const t = dayjs();
    setCursorDate(t);
    setSelectedDate(t.format('YYYY-MM-DD'));
  };

  const renderWeekView = () => {
    const startOfWeek = cursorDate.startOf('week').add(1, 'day');
    const days = Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day'));

    return (
      <div key={viewKey} className="timeline-week">
        {days.map((d, idx) => {
          const dateStr = d.format('YYYY-MM-DD');
          const dayEntries = entriesByDate[dateStr] || [];
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;

          return (
            <div
              key={dateStr}
              className={`timeline-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => handleDateClick(dateStr)}
            >
              <div className="timeline-cell-weekday">{WEEKDAYS[idx]}</div>
              <div className="timeline-cell-date">{d.format('D')}</div>
              {dayEntries.length > 0 && <div className="timeline-dot" />}
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const startOfMonth = cursorDate.startOf('month');
    const endOfMonth = cursorDate.endOf('month');
    const startWeekday = (startOfMonth.day() + 6) % 7;

    const cells: { date: dayjs.Dayjs; inMonth: boolean }[] = [];

    for (let i = 0; i < startWeekday; i++) {
      cells.push({ date: startOfMonth.subtract(startWeekday - i, 'day'), inMonth: false });
    }

    let cur = startOfMonth;
    while (cur.isBefore(endOfMonth) || cur.isSame(endOfMonth, 'day')) {
      cells.push({ date: cur, inMonth: true });
      cur = cur.add(1, 'day');
    }

    while (cells.length < 42) {
      cells.push({ date: cur, inMonth: false });
      cur = cur.add(1, 'day');
    }

    return (
      <div key={viewKey} className="timeline-month" style={{ gridTemplateRows: 'repeat(6, 1fr)' }}>
        {cells.map(({ date, inMonth }, idx) => {
          const dateStr = date.format('YYYY-MM-DD');
          const dayEntries = entriesByDate[dateStr] || [];
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const displayMoods = dayEntries.slice(0, 3).map((e) => MOOD_COLORS[e.mood]);

          return (
            <div
              key={`${dateStr}-${idx}`}
              className={`timeline-cell ${!inMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => handleDateClick(dateStr)}
              style={{ minHeight: '50px' }}
            >
              <div
                className="timeline-cell-date"
                style={{
                  fontSize: '0.9rem',
                  position: 'absolute',
                  top: '4px',
                  left: '6px',
                }}
              >
                {date.format('D')}
              </div>
              {displayMoods.length > 0 && (
                <div className="timeline-mood-dots" style={{ marginTop: '16px' }}>
                  {displayMoods.map((color, i) => (
                    <span
                      key={i}
                      className="timeline-dot"
                      style={{ background: color, width: '5px', height: '5px' }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="timeline-panel">
      <div className="timeline-header">
        <div className="timeline-month-label">
          {currentView === 'week'
            ? `${cursorDate.startOf('week').add(1, 'day').format('YYYY年MM月DD日')} - ${cursorDate.endOf('week').add(1, 'day').format('MM月DD日')}`
            : cursorDate.format('YYYY年MM月')}
        </div>
        <div className="timeline-nav">
          <button className="timeline-nav-btn" onClick={goPrev}>
            ‹
          </button>
          <button className="timeline-nav-btn" onClick={goToday} style={{ width: 'auto', padding: '0 12px', fontSize: '0.75rem' }}>
            今天
          </button>
          <button className="timeline-nav-btn" onClick={goNext}>
            ›
          </button>
        </div>
      </div>

      {currentView === 'week' ? renderWeekView() : renderMonthView()}
    </div>
  );
};

export default TimelinePanel;
