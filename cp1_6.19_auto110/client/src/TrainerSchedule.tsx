import React, { useState, useMemo } from 'react';
import { api } from './api';
import { User } from './types';

interface TrainerScheduleProps {
  currentUser: User;
}

interface ScheduleSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const TrainerSchedule: React.FC<TrainerScheduleProps> = ({ currentUser }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    return new Date(today.setDate(diff)).toISOString().split('T')[0];
  });

  const [schedule, setSchedule] = useState<ScheduleSlot[]>([
    { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
    { dayOfWeek: 1, startTime: '14:00', endTime: '18:00' },
    { dayOfWeek: 2, startTime: '09:00', endTime: '12:00' },
    { dayOfWeek: 3, startTime: '14:00', endTime: '20:00' },
    { dayOfWeek: 4, startTime: '09:00', endTime: '12:00' },
    { dayOfWeek: 5, startTime: '14:00', endTime: '18:00' },
    { dayOfWeek: 6, startTime: '10:00', endTime: '16:00' },
  ]);

  const [newSlot, setNewSlot] = useState<ScheduleSlot>({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '09:30',
  });

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const weekDates = useMemo(() => {
    const dates: string[] = [];
    const startDate = new Date(currentWeekStart);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  }, [currentWeekStart]);

  const handlePrevWeek = () => {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() - 7);
    setCurrentWeekStart(date.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + 7);
    setCurrentWeekStart(date.toISOString().split('T')[0]);
  };

  const handleAddSlot = () => {
    if (newSlot.startTime >= newSlot.endTime) {
      setSuccessMessage('开始时间必须早于结束时间');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }
    setSchedule([...schedule, { ...newSlot }]);
  };

  const handleRemoveSlot = (index: number) => {
    setSchedule(schedule.filter((_, i) => i !== index));
  };

  const handleCopyLastWeek = async () => {
    try {
      setSaving(true);
      await api.copyLastWeekSchedule(currentUser.id, currentWeekStart);
      setSuccessMessage('已复制上周排班！');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setSuccessMessage(error instanceof Error ? error.message : '复制失败');
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    try {
      setSaving(true);
      await api.setTrainerSchedule(currentUser.id, currentWeekStart, schedule);
      setSuccessMessage('排班保存成功！');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setSuccessMessage(error instanceof Error ? error.message : '保存失败');
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const getSlotsForDay = (dayOfWeek: number) => {
    return schedule
      .filter(s => s.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  return (
    <div className="trainer-schedule">
      <div className="page-header">
        <h2>⏰ 排班管理</h2>
        <p className="page-subtitle">设置您的可授课时间段</p>
      </div>

      {successMessage && (
        <div className="success-alert">
          <span>✓</span> {successMessage}
        </div>
      )}

      <div className="schedule-header">
        <button className="nav-btn" onClick={handlePrevWeek}>
          ‹ 上周
        </button>
        <h3>
          {weekDates[0]} ~ {weekDates[6]}
        </h3>
        <button className="nav-btn" onClick={handleNextWeek}>
          下周 ›
        </button>
      </div>

      <div className="schedule-actions">
        <button
          className="btn-secondary"
          onClick={handleCopyLastWeek}
          disabled={saving}
        >
          📋 复制上周排班
        </button>
      </div>

      <div className="schedule-grid">
        {dayNames.map((name, dayIndex) => (
          <div key={dayIndex} className="schedule-day-column">
            <div className="day-header">
              <div className="day-name">{name}</div>
              <div className="day-date">{weekDates[dayIndex].slice(5)}</div>
            </div>
            <div className="day-slots">
              {getSlotsForDay(dayIndex).map((slot, slotIndex) => {
                const globalIndex = schedule.findIndex(
                  s => s.dayOfWeek === dayIndex &&
                    s.startTime === slot.startTime &&
                    s.endTime === slot.endTime
                );
                return (
                  <div key={slotIndex} className="schedule-slot">
                    <span className="slot-time">
                      {slot.startTime} - {slot.endTime}
                    </span>
                    <button
                      className="remove-slot-btn"
                      onClick={() => handleRemoveSlot(globalIndex)}
                      title="删除时段"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="add-slot-section">
        <h4>添加新时段</h4>
        <div className="add-slot-form">
          <div className="form-group">
            <label>星期</label>
            <select
              value={newSlot.dayOfWeek}
              onChange={e => setNewSlot({ ...newSlot, dayOfWeek: Number(e.target.value) })}
            >
              {dayNames.map((name, index) => (
                <option key={index} value={index}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>开始时间</label>
            <select
              value={newSlot.startTime}
              onChange={e => setNewSlot({ ...newSlot, startTime: e.target.value })}
            >
              {generateTimeOptions()}
            </select>
          </div>
          <div className="form-group">
            <label>结束时间</label>
            <select
              value={newSlot.endTime}
              onChange={e => setNewSlot({ ...newSlot, endTime: e.target.value })}
            >
              {generateTimeOptions()}
            </select>
          </div>
          <button className="btn-primary" onClick={handleAddSlot}>
            + 添加
          </button>
        </div>
      </div>

      <div className="schedule-footer">
        <button
          className="btn-primary large"
          onClick={handleSaveSchedule}
          disabled={saving}
        >
          {saving ? '保存中...' : '💾 保存排班'}
        </button>
      </div>
    </div>
  );
};

function generateTimeOptions() {
  const options: JSX.Element[] = [];
  for (let hour = 9; hour <= 21; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      options.push(
        <option key={time} value={time}>
          {time}
        </option>
      );
    }
  }
  return options;
}

export default TrainerSchedule;
