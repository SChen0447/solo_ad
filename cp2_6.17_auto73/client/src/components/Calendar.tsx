import { useState } from 'react';

interface Task {
  id: string;
  planId: string;
  date: string;
  title: string;
  estimatedMinutes: number;
  completed: boolean;
}

interface CalendarProps {
  tasks: Task[];
  taskDates: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export default function Calendar({ taskDates, selectedDate, onSelectDate }: CalendarProps) {
  const [viewDate, setViewDate] = useState(() => {
    if (selectedDate) return new Date(selectedDate);
    return new Date();
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const formatDate = (y: number, m: number, d: number) => {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const today = new Date();
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

  const cells: { date: string; day: number; isCurrentMonth: boolean }[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = month - 1;
    const y = m < 0 ? year - 1 : year;
    const actualM = m < 0 ? 11 : m;
    cells.push({ date: formatDate(y, actualM, d), day: d, isCurrentMonth: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: formatDate(year, month, d), day: d, isCurrentMonth: true });
  }

  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month + 1;
    const y = m > 11 ? year + 1 : year;
    const actualM = m > 11 ? 0 : m;
    cells.push({ date: formatDate(y, actualM, d), day: d, isCurrentMonth: false });
  }

  return (
    <div className="calendar-panel">
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={prevMonth}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h3>{year}年{month + 1}月</h3>
        <button className="calendar-nav-btn" onClick={nextMonth}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>
      <div className="calendar-weekdays">
        {weekdays.map(w => <div key={w} className="calendar-weekday">{w}</div>)}
      </div>
      <div className="calendar-days">
        {cells.map((cell, idx) => {
          const hasTask = taskDates.includes(cell.date);
          const isToday = cell.date === todayStr;
          const isSelected = cell.date === selectedDate;
          let cls = 'calendar-day';
          if (!cell.isCurrentMonth) cls += ' other-month';
          if (hasTask) cls += ' has-task';
          if (isToday) cls += ' today';
          if (isSelected) cls += ' selected';
          return (
            <div key={idx} className={cls} onClick={() => onSelectDate(cell.date)}>
              {cell.day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
