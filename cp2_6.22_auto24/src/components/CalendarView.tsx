import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Plant, Plan, Task } from '@/types';
import { taskApi } from '@/utils/api';

interface CalendarViewProps {
  plants: Plant[];
  plans: Plan[];
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

interface DayMarkers {
  water: boolean;
  fertilize: boolean;
  harvest: boolean;
}

const CalendarView: React.FC<CalendarViewProps> = ({ plants, plans }) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayTasks, setDayTasks] = useState<Task[]>([]);
  const [completedLocal, setCompletedLocal] = useState<Set<string>>(new Set());

  const markers = useMemo(() => {
    const map: Record<string, DayMarkers> = {};
    for (const plan of plans) {
      const plant = plants.find((p) => p.id === plan.plantId);
      if (!plant) continue;

      const sowDate = new Date(plan.sowDate);
      const daysInMonth = getDaysInMonth(currentYear, currentMonth);

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = formatDate(currentYear, currentMonth, day);
        const checkDate = new Date(currentYear, currentMonth, day);
        const diffDays = Math.floor((checkDate.getTime() - sowDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) continue;

        if (!map[dateStr]) map[dateStr] = { water: false, fertilize: false, harvest: false };

        if (diffDays > 0 && diffDays % plant.wateringFrequency === 0) {
          map[dateStr].water = true;
        }
        if (diffDays > 0 && diffDays % plant.fertilizingCycle === 0) {
          map[dateStr].fertilize = true;
        }

        const harvestDate = new Date(sowDate);
        harvestDate.setDate(harvestDate.getDate() + plant.maturityDays);
        const harvestStr = harvestDate.toISOString().split('T')[0];
        if (dateStr === harvestStr) {
          map[dateStr].harvest = true;
        }
      }
    }
    return map;
  }, [plants, plans, currentYear, currentMonth]);

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfWeek(currentYear, currentMonth);
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [currentYear, currentMonth]);

  const fetchTasks = useCallback(async (date: string) => {
    try {
      const tasks = await taskApi.getByDate(date);
      setDayTasks(tasks);
    } catch {
      setDayTasks([]);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) fetchTasks(selectedDate);
  }, [selectedDate, fetchTasks]);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDate(null);
  };

  const handleDateClick = (day: number) => {
    const dateStr = formatDate(currentYear, currentMonth, day);
    setSelectedDate(dateStr === selectedDate ? null : dateStr);
  };

  const toggleTask = async (task: Task) => {
    if (completedLocal.has(task.id)) {
      completedLocal.delete(task.id);
      setCompletedLocal(new Set(completedLocal));
      try { await taskApi.uncomplete(task.id); } catch {}
    } else {
      completedLocal.add(task.id);
      setCompletedLocal(new Set(completedLocal));
      try { await taskApi.complete(task.id); } catch {}
    }
  };

  const isOverdue = (task: Task) => {
    if (completedLocal.has(task.id)) return false;
    const taskDate = new Date(selectedDate!);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return taskDate < now;
  };

  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button onClick={prevMonth} style={navBtnStyle}>◀</button>
        <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#065F46', margin: 0 }}>
          {currentYear}年{currentMonth + 1}月
        </h3>
        <button onClick={nextMonth} style={navBtnStyle}>▶</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
        {WEEKDAYS.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6B7280', padding: '8px 0' }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {calendarDays.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} style={{ height: '80px' }} />;

          const dateStr = formatDate(currentYear, currentMonth, day);
          const m = markers[dateStr];
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;

          return (
            <div
              key={dateStr}
              onClick={() => handleDateClick(day)}
              style={{
                height: '80px',
                width: '80px',
                padding: '6px',
                borderRadius: '8px',
                border: isSelected ? '2px solid #10B981' : '1px solid #E5E7EB',
                background: isSelected ? '#ECFDF5' : isToday ? '#F0FDF4' : '#FFFFFF',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.15s',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: isToday ? 700 : 400, color: isToday ? '#065F46' : '#374151' }}>
                {day}
              </div>
              <div style={{ display: 'flex', gap: '3px', marginTop: '4px', flexWrap: 'wrap' }}>
                {m?.water && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6', display: 'inline-block' }} />}
                {m?.fertilize && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />}
                {m?.harvest && <span style={{ fontSize: '12px', color: '#10B981' }}>★</span>}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '12px',
            background: '#1F2933',
            borderRadius: '12px',
            padding: '16px',
            minWidth: '280px',
            maxWidth: '360px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            zIndex: 100,
            color: '#FFFFFF',
            border: dayTasks.some((t) => isOverdue(t)) ? '2px solid #EF4444' : '2px solid transparent',
            animation: dayTasks.some((t) => isOverdue(t)) ? 'shake 0.5s' : 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>{selectedDate} 待办</span>
            <button
              onClick={() => setSelectedDate(null)}
              style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          {dayTasks.length === 0 ? (
            <div style={{ color: '#9CA3AF', fontSize: '14px', textAlign: 'center', padding: '12px 0' }}>今天没有待办事项 🌿</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {dayTasks.map((task) => {
                const done = completedLocal.has(task.id);
                const overdue = isOverdue(task);
                const dotColor = task.type === 'water' ? '#3B82F6' : task.type === 'fertilize' ? '#F59E0B' : '#10B981';

                return (
                  <label
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 0',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggleTask(task)}
                      style={{ accentColor: '#10B981', width: '16px', height: '16px' }}
                    />
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                    <span
                      style={{
                        fontSize: '14px',
                        transition: 'all 0.3s',
                        textDecoration: done ? 'line-through' : 'none',
                        color: done ? '#6B7280' : overdue ? '#EF4444' : '#FFFFFF',
                      }}
                    >
                      {task.planName} - {task.label}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(-50%) translateX(0); }
          20% { transform: translateX(-50%) translateX(-4px); }
          40% { transform: translateX(-50%) translateX(4px); }
          60% { transform: translateX(-50%) translateX(-4px); }
          80% { transform: translateX(-50%) translateX(4px); }
        }
      `}</style>
    </div>
  );
};

const navBtnStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  border: '1px solid #D1D5DB',
  background: '#FFFFFF',
  cursor: 'pointer',
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#374151',
};

export default CalendarView;
