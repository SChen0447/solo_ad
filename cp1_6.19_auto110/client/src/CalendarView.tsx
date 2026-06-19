import React, { useState, useEffect, useMemo } from 'react';
import { api } from './api';
import { TimeSlot, User, Trainer, CourseType, courseTypeLabels } from './types';
import BookingModal from './BookingModal';

interface CalendarViewProps {
  currentUser: User;
  trainers: Trainer[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ currentUser, trainers }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<string>('');
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  const monthStart = useMemo(() => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    return date.toISOString().split('T')[0];
  }, [currentMonth]);

  const monthEnd = useMemo(() => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    return date.toISOString().split('T')[0];
  }, [currentMonth]);

  useEffect(() => {
    const loadTimeSlots = async () => {
      setLoading(true);
      try {
        const slots = await api.getTimeslots(
          monthStart,
          monthEnd,
          selectedTrainer || undefined
        );
        setTimeSlots(slots);
      } catch (error) {
        console.error('加载时段失败:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTimeSlots();
  }, [monthStart, monthEnd, selectedTrainer]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: { date: Date; dateStr: string; slots: TimeSlot[] }[] = [];

    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, dateStr: '', slots: [] });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      const dateStr = date.toISOString().split('T')[0];
      const daySlots = timeSlots.filter(s => s.date === dateStr);
      days.push({ date, dateStr, slots: daySlots });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, dateStr: '', slots: [] });
    }

    return days;
  }, [currentMonth, timeSlots]);

  const getDayStatus = (day: { date: Date; dateStr: string; slots: TimeSlot[] }) => {
    if (!day.dateStr) return 'other-month';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(day.date);
    dayDate.setHours(0, 0, 0, 0);

    if (dayDate < today) return 'expired';
    if (day.slots.length === 0) return 'no-slots';

    const availableSlots = day.slots.filter(s => !s.isBooked);
    if (availableSlots.length === 0) return 'fully-booked';
    return 'available';
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const handleDayClick = (day: { date: Date; dateStr: string; slots: TimeSlot[] }) => {
    if (!day.dateStr || getDayStatus(day) === 'expired' || getDayStatus(day) === 'no-slots') return;
    setSelectedDate(day.dateStr);
  };

  const handleSlotClick = (slot: TimeSlot) => {
    if (slot.isBooked) return;
    setSelectedSlot(slot);
    setShowModal(true);
  };

  const handleBookingSuccess = () => {
    setShowModal(false);
    setSelectedSlot(null);
    setBookingSuccess('预约成功！');
    setTimeout(() => setBookingSuccess(null), 3000);
    const refreshSlots = async () => {
      const slots = await api.getTimeslots(monthStart, monthEnd, selectedTrainer || undefined);
      setTimeSlots(slots);
    };
    refreshSlots();
  };

  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

  const selectedDaySlots = selectedDate
    ? timeSlots.filter(s => s.date === selectedDate && !s.isBooked)
    : [];

  return (
    <div className="calendar-view">
      <div className="page-header">
        <h2>📅 课程预约</h2>
        <p className="page-subtitle">选择合适的时段预约私教课程</p>
      </div>

      {bookingSuccess && (
        <div className="success-alert">
          <span>✓</span> {bookingSuccess}
        </div>
      )}

      <div className="filter-bar">
        <div className="filter-item">
          <label htmlFor="trainer-filter">筛选教练：</label>
          <select
            id="trainer-filter"
            value={selectedTrainer}
            onChange={e => setSelectedTrainer(e.target.value)}
          >
            <option value="">全部教练</option>
            {trainers.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} - {t.specialty}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="calendar-container">
        <div className="calendar-header">
          <button className="nav-btn" onClick={handlePrevMonth}>
            ‹
          </button>
          <h3>
            {currentMonth.getFullYear()}年 {monthNames[currentMonth.getMonth()]}
          </h3>
          <button className="nav-btn" onClick={handleNextMonth}>
            ›
          </button>
        </div>

        <div className="calendar-legend">
          <div className="legend-item">
            <span className="legend-dot available"></span>
            <span>可预约</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot fully-booked"></span>
            <span>已约满</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot expired"></span>
            <span>已过期</span>
          </div>
        </div>

        {loading ? (
          <div className="calendar-loading">
            <div className="loading-spinner small"></div>
            <p>加载日历数据...</p>
          </div>
        ) : (
          <>
            <div className="calendar-grid">
              {dayNames.map(name => (
                <div key={name} className="calendar-day-name">
                  {name}
                </div>
              ))}
              {calendarDays.map((day, index) => {
                const status = getDayStatus(day);
                const isSelected = selectedDate === day.dateStr;
                return (
                  <div
                    key={index}
                    className={`calendar-day ${status} ${isSelected ? 'selected' : ''} ${day.dateStr ? '' : 'other-month'}`}
                    onClick={() => handleDayClick(day)}
                  >
                    <span className="day-number">{day.date.getDate()}</span>
                    {day.dateStr && day.slots.length > 0 && (
                      <div className="day-slots-info">
                        <span className="available-count">
                          {day.slots.filter(s => !s.isBooked).length}
                        </span>
                        <span className="total-count">/{day.slots.length}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {selectedDate && (
              <div className="time-slots-panel">
                <div className="panel-header">
                  <h4>
                    {selectedDate} 可选时段
                    <button className="close-panel" onClick={() => setSelectedDate(null)}>
                      ×
                    </button>
                  </h4>
                </div>
                {selectedDaySlots.length === 0 ? (
                  <p className="no-slots-message">该日无可预约时段</p>
                ) : (
                  <div className="time-slots-list">
                    {selectedDaySlots.map(slot => (
                      <div
                        key={slot.id}
                        className={`time-slot-item ${slot.isBooked ? 'booked' : ''}`}
                        onClick={() => handleSlotClick(slot)}
                      >
                        <div className="slot-time">
                          {slot.startTime} - {slot.endTime}
                        </div>
                        <div className="slot-trainer">
                          <span className="trainer-name">{slot.trainerName}</span>
                          <span className="trainer-specialty">{slot.specialty}</span>
                        </div>
                        {!slot.isBooked && (
                          <button className="book-btn">预约</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showModal && selectedSlot && (
        <BookingModal
          slot={selectedSlot}
          currentUser={currentUser}
          courseTypes={Object.entries(courseTypeLabels) as [CourseType, string][]}
          onClose={() => setShowModal(false)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
};

export default CalendarView;
