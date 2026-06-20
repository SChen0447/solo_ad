import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from './types';
import { TASK_COLORS, TASK_LABELS } from './constants';

interface CalendarProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
}

export default function Calendar({ tasks, onToggleTask }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay();

  const formatDate = (day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const today = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }, []);

  const getTasksForDate = (dateStr: string) => {
    return tasks.filter(task => task.date === dateStr);
  };

  const getTaskDots = (dateStr: string) => {
    const dayTasks = getTasksForDate(dateStr);
    const types = new Set(dayTasks.filter(t => !t.completed).map(t => t.type));
    return Array.from(types);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const dateStr = formatDate(day);
    setSelectedDate(selectedDate === dateStr ? null : dateStr);
  };

  const selectedTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  const renderCalendarDays = () => {
    const days = [];
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    weekDays.forEach((day, index) => {
      days.push(
        <div
          key={`header-${day}`}
          style={{
            textAlign: 'center',
            padding: '12px 0',
            fontWeight: '600',
            color: index === 0 || index === 6 ? '#EF5350' : '#2E7D32',
            fontSize: '14px'
          }}
        >
          {day}
        </div>
      );
    });

    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} style={{ padding: '12px 0' }} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(day);
      const isToday = dateStr === today;
      const isSelected = selectedDate === dateStr;
      const taskDots = getTaskDots(dateStr);
      const dayTasks = getTasksForDate(dateStr);
      const hasIncompleteTasks = dayTasks.some(t => !t.completed);

      days.push(
        <motion.div
          key={day}
          style={{
            padding: '8px',
            minHeight: '70px',
            borderRadius: '8px',
            cursor: 'pointer',
            position: 'relative',
            backgroundColor: isSelected ? '#C8E6C9' : isToday ? '#E8F5E9' : 'transparent',
            border: isToday ? `2px solid #4CAF50` : '2px solid transparent',
            transition: 'background-color 0.2s'
          }}
          whileHover={{ backgroundColor: '#E8F5E9' }}
          onClick={() => handleDateClick(day)}
        >
          <div
            style={{
              fontWeight: isToday ? '700' : '400',
              color: isToday ? '#2E7D32' : '#33691E',
              fontSize: '14px',
              marginBottom: '6px'
            }}
          >
            {day}
          </div>
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
            {taskDots.map((type, idx) => (
              <div
                key={idx}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: TASK_COLORS[type as keyof typeof TASK_COLORS]
                }}
              />
            ))}
          </div>
          {hasIncompleteTasks && (
            <div
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#F44336'
              }}
            />
          )}
        </motion.div>
      );
    }

    return days;
  };

  return (
    <div className="calendar-container" style={{ display: 'flex', gap: '24px' }}>
      <div style={{ flex: 1, background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(76, 175, 80, 0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <motion.button
            className="btn btn-secondary"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={prevMonth}
          >
            ◀ 上月
          </motion.button>
          <h2 style={{ fontSize: '20px', color: '#2E7D32', fontWeight: '600' }}>
            {year}年{month + 1}月
          </h2>
          <motion.button
            className="btn btn-secondary"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={nextMonth}
          >
            下月 ▶
          </motion.button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px'
          }}
        >
          {renderCalendarDays()}
        </div>

        <div style={{ display: 'flex', gap: '20px', marginTop: '20px', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#4CAF50' }} />
            <span style={{ fontSize: '12px', color: '#558B2F' }}>浇水</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#FFC107' }} />
            <span style={{ fontSize: '12px', color: '#558B2F' }}>施肥</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#8D6E63' }} />
            <span style={{ fontSize: '12px', color: '#558B2F' }}>换土</span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            style={{
              width: '320px',
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(76, 175, 80, 0.1)',
              maxHeight: '500px',
              overflowY: 'auto'
            }}
          >
            <h3 style={{ fontSize: '18px', color: '#2E7D32', marginBottom: '16px' }}>
              📅 {selectedDate} 任务
            </h3>

            {selectedTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9E9E9E' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌿</div>
                <div>今天没有养护任务</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedTasks.map(task => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: task.completed ? '#F1F8E9' : '#FAFAFA',
                      border: `1px solid ${TASK_COLORS[task.type]}40`
                    }}
                  >
                    <motion.label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        gap: '8px',
                        flex: 1
                      }}
                    >
                      <motion.input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => onToggleTask(task.id)}
                        style={{
                          width: '20px',
                          height: '20px',
                          accentColor: '#4CAF50',
                          cursor: 'pointer'
                        }}
                        whileTap={{ scale: 1.2 }}
                        transition={{ duration: 0.2 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '14px',
                            color: '#2E7D32',
                            textDecoration: task.completed ? 'line-through' : 'none',
                            opacity: task.completed ? 0.6 : 1
                          }}
                        >
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: TASK_COLORS[task.type],
                              color: 'white',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}
                          >
                            {TASK_LABELS[task.type]}
                          </span>
                          <span style={{ fontWeight: '500' }}>{task.plantName}</span>
                        </div>
                      </div>
                    </motion.label>
                  </motion.div>
                ))}
              </div>
            )}

            <motion.button
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '20px' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedDate(null)}
            >
              关闭
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
