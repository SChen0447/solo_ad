import { useState } from 'react';
import { DiaryEntry } from '../types';
import { generateCalendarGrid, formatDateKey, getMonthName } from '../utils/calendarHelper';
import './Calendar.css';

interface CalendarProps {
  entries: DiaryEntry[];
  onDateSelect?: (date: string) => void;
}

export default function Calendar({ entries, onDateSelect }: CalendarProps) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [isFlipping, setIsFlipping] = useState(false);

  const calendarGrid = generateCalendarGrid(currentYear, currentMonth, entries);

  const changeMonth = (direction: number) => {
    if (isFlipping) return;
    
    setIsFlipping(true);
    
    setTimeout(() => {
      const newDate = new Date(currentYear, currentMonth + direction, 1);
      setCurrentYear(newDate.getFullYear());
      setCurrentMonth(newDate.getMonth());
      
      setTimeout(() => {
        setIsFlipping(false);
      }, 100);
    }, 250);
  };

  const handleDateClick = (date: Date) => {
    if (onDateSelect) {
      onDateSelect(formatDateKey(date));
    }
  };

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button
          className="calendar-nav"
          onClick={() => changeMonth(-1)}
          disabled={isFlipping}
        >
          ‹
        </button>
        <h3 className="calendar-title">
          {currentYear}年 {getMonthName(currentMonth)}
        </h3>
        <button
          className="calendar-nav"
          onClick={() => changeMonth(1)}
          disabled={isFlipping}
        >
          ›
        </button>
      </div>
      
      <div className={`calendar-grid-wrapper ${isFlipping ? 'flipping' : ''}`}>
        <div className="calendar-weekdays">
          {weekdays.map(day => (
            <div key={day} className="calendar-weekday">
              {day}
            </div>
          ))}
        </div>
        
        <div className="calendar-days">
          {calendarGrid.flat().map((dayInfo, index) => (
            <div
              key={index}
              className={`calendar-day ${!dayInfo.isCurrentMonth ? 'other-month' : ''}`}
              onClick={() => handleDateClick(dayInfo.date)}
            >
              <span
              className={`day-number ${dayInfo.isToday ? 'today' : ''}`}
              >
                {dayInfo.day}
              </span>
              {dayInfo.hasDiary && dayInfo.moodColor && (
                <span
                  className="mood-dot"
                  style={{ backgroundColor: dayInfo.moodColor }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
