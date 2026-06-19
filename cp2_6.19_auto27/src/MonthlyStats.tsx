import React, { useState, useMemo, useCallback } from 'react';
import type { MoodRecord } from './types';
import { MOOD_CONFIGS } from './types';
import { formatDate, getAverageMoodValue } from './utils/storage';

interface MonthlyStatsProps {
  records: MoodRecord[];
}

interface HeatmapCell {
  date: string | null;
  dayOfMonth: number | null;
  avgValue: number;
  count: number;
  color: string;
  textColor: string;
}

function getColorForValue(value: number): string {
  if (value === 0) return '#fafafa';
  const ratio = (value - 1) / 4;
  const r = Math.round(239 + (100 - 239) * ratio);
  const g = Math.round(83 + (194 - 83) * ratio);
  const b = Math.round(80 + (255 - 80) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function MonthlyStats({ records }: MonthlyStatsProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const weeks: HeatmapCell[][] = [];
    let currentWeek: HeatmapCell[] = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: null, dayOfMonth: null, avgValue: 0, count: 0, color: '#fafafa', textColor: '#ccc' });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = formatDate(date);
      const dayRecords = records.filter((r) => r.date === dateStr);
      const avgValue = dayRecords.length > 0 
        ? getAverageMoodValue(dayRecords, MOOD_CONFIGS) 
        : 0;
      const color = dayRecords.length > 0 ? getColorForValue(avgValue) : '#fafafa';
      const textColor = avgValue > 0 && avgValue < 3 ? 'white' : (dayRecords.length > 0 ? '#333' : '#ccc');

      currentWeek.push({
        date: dateStr,
        dayOfMonth: day,
        avgValue,
        count: dayRecords.length,
        color,
        textColor
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: null, dayOfMonth: null, avgValue: 0, count: 0, color: '#fafafa', textColor: '#ccc' });
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [currentDate, records]);

  const goToPrevMonth = useCallback(() => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const monthName = `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`;

  const canGoNext = useMemo(() => {
    const today = new Date();
    return currentDate.getMonth() !== today.getMonth() || currentDate.getFullYear() !== today.getFullYear();
  }, [currentDate]);

  return (
    <div className="section">
      <div className="month-header">
        <h2 className="section-title" style={{ marginBottom: 0 }}>月度情绪热力图</h2>
        <div className="month-nav">
          <button className="btn btn-outline" onClick={goToPrevMonth}>&larr; 上月</button>
          <button className="btn btn-outline" onClick={goToToday}>今天</button>
          <button 
            className="btn btn-outline" 
            onClick={goToNextMonth} 
            disabled={!canGoNext}
            style={{ opacity: canGoNext ? 1 : 0.5, cursor: canGoNext ? 'pointer' : 'not-allowed' }}
          >
            下月 &rarr;
          </button>
        </div>
      </div>

      <div className="month-title" style={{ textAlign: 'center', marginBottom: 16 }}>{monthName}</div>

      <div className="heatmap">
        <div className="heatmap-grid">
          <div className="heatmap-header-cell">周次</div>
          {weekDays.map((day) => (
            <div key={day} className="heatmap-header-cell">{day}</div>
          ))}

          {monthData.map((week, weekIndex) => (
            <React.Fragment key={weekIndex}>
              <div className="heatmap-week-label">第{weekIndex + 1}周</div>
              {week.map((cell, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`heatmap-cell ${cell.date ? '' : 'heatmap-cell-empty'}`}
                  style={{
                    backgroundColor: cell.color,
                    color: cell.textColor
                  }}
                >
                  {cell.dayOfMonth}
                  {cell.date && (
                    <div className="heatmap-tooltip">
                      {cell.date} · 情绪值 {cell.avgValue.toFixed(1)} · {cell.count}条记录
                    </div>
                  )}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#666' }}>😠 负面</span>
        <div style={{
          width: 150,
          height: 12,
          borderRadius: 6,
          background: 'linear-gradient(to right, #ef5350, #e57373, #ef9a9a, #ffcdd2, #bbdefb, #90caf9, #64b5f6)'
        }} />
        <span style={{ fontSize: 12, color: '#666' }}>正面 😊</span>
      </div>
    </div>
  );
}


