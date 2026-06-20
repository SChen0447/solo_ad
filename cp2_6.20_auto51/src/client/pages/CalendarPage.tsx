import React, { useState, useEffect, useCallback } from 'react';

interface Event {
  id: string;
  date: string;
  city: string;
  venue: string;
  startTime: string;
  expectedAttendance: number;
  notes: string;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];

const getColorByCity = (city: string): string => {
  let hash = 0;
  for (let i = 0; i < city.length; i++) {
    hash = city.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
};

const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [newEvents, setNewEvents] = useState<Set<string>>(new Set());
  const [monthTransitioning, setMonthTransitioning] = useState(false);

  const [formData, setFormData] = useState({
    date: '',
    city: '',
    venue: '',
    startTime: '20:00',
    expectedAttendance: 0,
    notes: ''
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay };
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentDate);

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getEventsForDate = (dateStr: string) => {
    return events.filter(e => e.date === dateStr);
  };

  const prevMonth = () => {
    setMonthTransitioning(true);
    setTimeout(() => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
      setMonthTransitioning(false);
    }, 150);
  };

  const nextMonth = () => {
    setMonthTransitioning(true);
    setTimeout(() => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
      setMonthTransitioning(false);
    }, 150);
  };

  const handleDateClick = (day: number) => {
    const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(dateStr);
    setFormData(prev => ({ ...prev, date: dateStr }));
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const newEvent = await res.json();
      setEvents(prev => [...prev, newEvent]);
      setNewEvents(prev => new Set([...prev, newEvent.id]));
      setTimeout(() => {
        setNewEvents(prev => {
          const next = new Set(prev);
          next.delete(newEvent.id);
          return next;
        });
      }, 500);
      setShowModal(false);
      setFormData({
        date: '',
        city: '',
        venue: '',
        startTime: '20:00',
        expectedAttendance: 0,
        notes: ''
      });
    } catch (err) {
      console.error('Failed to create event:', err);
    }
  };

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

  const renderCalendarGrid = () => {
    const cells = [];
    for (let i = 0; i < startingDay; i++) {
      cells.push(<div key={`empty-${i}`} className="calendar-day empty" />);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(dateStr);
      const isToday = dateStr === new Date().toISOString().split('T')[0];

      cells.push(
        <div
          key={day}
          className={`calendar-day ${isToday ? 'today' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
          onClick={() => handleDateClick(day)}
        >
          <span className="day-number">{day}</span>
          <div className="events-container">
            {dayEvents.slice(0, 2).map(event => (
              <div
                key={event.id}
                className={`event-tag ${newEvents.has(event.id) ? 'bounce-in' : ''}`}
                style={{ backgroundColor: getColorByCity(event.city) }}
              >
                <span className="event-city">{event.city}</span>
                <span className="event-venue">{event.venue}</span>
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="more-events">+{dayEvents.length - 2} 更多</div>
            )}
          </div>
        </div>
      );
    }
    return cells;
  };

  const renderListView = () => {
    const sortedEvents = [...events].sort((a, b) => a.date.localeCompare(b.date));
    const monthEvents = sortedEvents.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate.getFullYear() === currentDate.getFullYear() &&
             eventDate.getMonth() === currentDate.getMonth();
    });

    if (monthEvents.length === 0) {
      return <div className="no-events">本月暂无演出安排</div>;
    }

    return (
      <div className="event-list">
        {monthEvents.map(event => (
          <div
            key={event.id}
            className={`event-list-item ${newEvents.has(event.id) ? 'bounce-in' : ''}`}
            style={{ borderLeftColor: getColorByCity(event.city) }}
          >
            <div className="event-date">
              <div className="event-day">{new Date(event.date).getDate()}</div>
              <div className="event-month">{monthNames[new Date(event.date).getMonth()]}</div>
            </div>
            <div className="event-info">
              <div className="event-city-mobile">{event.city}</div>
              <div className="event-venue-mobile">{event.venue}</div>
              <div className="event-time">{event.startTime}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="calendar-page">
      <div className="calendar-header">
        <button onClick={prevMonth} className="nav-btn">
          ←
        </button>
        <h2 className="month-title">
          {currentDate.getFullYear()}年 {monthNames[currentDate.getMonth()]}
        </h2>
        <button onClick={nextMonth} className="nav-btn">
          →
        </button>
      </div>

      {isMobile ? (
        <div className={`calendar-list ${monthTransitioning ? 'fade' : ''}`}>
          {renderListView()}
        </div>
      ) : (
        <div className={`calendar-grid ${monthTransitioning ? 'fade' : ''}`}>
          <div className="calendar-weekdays">
            {dayNames.map(day => (
              <div key={day} className="weekday">{day}</div>
            ))}
          </div>
          <div className="calendar-days">
            {renderCalendarGrid()}
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">创建演出日程</h3>
            <form onSubmit={handleSubmit} className="event-form">
              <div className="form-group">
                <label>日期</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>城市</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="输入城市名"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>开始时间</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={e => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>场馆</label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={e => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                  placeholder="输入场馆名称"
                  required
                />
              </div>
              <div className="form-group">
                <label>预计人数</label>
                <input
                  type="number"
                  value={formData.expectedAttendance}
                  onChange={e => setFormData(prev => ({ ...prev, expectedAttendance: Number(e.target.value) }))}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>备注</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="添加备注信息..."
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .calendar-page {
          background-color: #16213e;
          border-radius: 12px;
          padding: 24px;
        }

        .calendar-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
          margin-bottom: 24px;
        }

        .month-title {
          font-size: 24px;
          font-weight: 600;
          color: #e0e0e0;
          min-width: 200px;
          text-align: center;
        }

        .nav-btn {
          width: 40px;
          height: 40px;
          border-radius: 6px;
          border: none;
          background-color: #0f3460;
          color: #e0e0e0;
          font-size: 18px;
          cursor: pointer;
          transition: filter 0.2s ease;
        }

        .nav-btn:hover {
          filter: brightness(1.2);
        }

        .calendar-grid {
          transition: opacity 0.15s ease;
        }

        .calendar-grid.fade {
          opacity: 0;
        }

        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          margin-bottom: 8px;
        }

        .weekday {
          text-align: center;
          font-size: 14px;
          color: #888;
          padding: 8px 0;
          font-weight: 500;
        }

        .calendar-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }

        .calendar-day {
          min-height: 100px;
          background-color: #0f3460;
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .calendar-day:hover {
          background-color: #533483;
          transform: translateY(-2px);
        }

        .calendar-day.empty {
          background-color: transparent;
          cursor: default;
        }

        .calendar-day.empty:hover {
          transform: none;
        }

        .calendar-day.today .day-number {
          background-color: #4ECDC4;
          color: #1a1a2e;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }

        .day-number {
          font-size: 14px;
          color: #e0e0e0;
          margin-bottom: 4px;
        }

        .events-container {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .event-tag {
          padding: 4px 6px;
          border-radius: 6px;
          font-size: 11px;
          color: #1a1a2e;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .event-tag.bounce-in {
          animation: bounceIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .event-city {
          font-weight: 600;
          display: block;
        }

        .event-venue {
          font-size: 10px;
          opacity: 0.8;
        }

        .more-events {
          font-size: 10px;
          color: #888;
          padding-left: 4px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }

        .modal-content {
          background-color: #fff;
          border-radius: 12px;
          padding: 28px;
          width: 90%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .scale-in {
          animation: scaleIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .modal-title {
          font-size: 20px;
          font-weight: 600;
          color: #1a1a2e;
          margin-bottom: 20px;
        }

        .event-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }

        .form-group input,
        .form-group textarea {
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          background-color: #fff;
          color: #333;
          transition: border-color 0.2s ease;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #4ECDC4;
        }

        .form-group textarea {
          resize: vertical;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 8px;
        }

        .btn {
          padding: 10px 24px;
          border-radius: 6px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: filter 0.2s ease;
        }

        .btn:hover {
          filter: brightness(1.2);
        }

        .btn-primary {
          background-color: #4ECDC4;
          color: #fff;
        }

        .btn-secondary {
          background-color: #e0e0e0;
          color: #333;
        }

        .calendar-list.fade {
          opacity: 0;
        }

        .no-events {
          text-align: center;
          padding: 40px;
          color: #888;
        }

        .event-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .event-list-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background-color: #0f3460;
          border-radius: 8px;
          border-left: 4px solid;
        }

        .event-list-item.bounce-in {
          animation: bounceIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .event-date {
          text-align: center;
          min-width: 60px;
        }

        .event-day {
          font-size: 24px;
          font-weight: 700;
          color: #e0e0e0;
        }

        .event-month {
          font-size: 12px;
          color: #888;
        }

        .event-info {
          flex: 1;
        }

        .event-city-mobile {
          font-size: 16px;
          font-weight: 600;
          color: #e0e0e0;
        }

        .event-venue-mobile {
          font-size: 14px;
          color: #aaa;
          margin: 4px 0;
        }

        .event-time {
          font-size: 13px;
          color: #4ECDC4;
        }

        @media (max-width: 768px) {
          .calendar-page {
            padding: 16px;
          }

          .month-title {
            font-size: 18px;
            min-width: 140px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default CalendarPage;
