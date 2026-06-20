import React, { useState, useEffect } from 'react';
import { Event } from '../types';

interface CalendarPageProps {
  isMobile: boolean;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

const CalendarPage: React.FC<CalendarPageProps> = ({ isMobile }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [newEvent, setNewEvent] = useState({
    city: '',
    venue: '',
    startTime: '',
    expectedAttendance: 0,
    notes: ''
  });
  const [newEventId, setNewEventId] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getEventsForDate = (dateKey: string) => {
    return events.filter(event => event.date === dateKey);
  };

  const handlePrevMonth = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
      setIsAnimating(false);
    }, 150);
  };

  const handleNextMonth = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
      setIsAnimating(false);
    }, 150);
  };

  const handleDateClick = (dateKey: string) => {
    setSelectedDate(dateKey);
    setNewEvent({
      city: '',
      venue: '',
      startTime: '',
      expectedAttendance: 0,
      notes: ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          ...newEvent
        })
      });
      const createdEvent = await response.json();
      setEvents(prev => [...prev, createdEvent]);
      setNewEventId(createdEvent.id);
      setTimeout(() => setNewEventId(null), 500);
      setShowModal(false);
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();
    const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

    const days = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} style={{ padding: '8px', minHeight: isMobile ? '80px' : '120px' }} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(year, month, day);
      const dayEvents = getEventsForDate(dateKey);
      const isToday = dateKey === todayKey;

      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(dateKey)}
          style={{
            padding: '8px',
            minHeight: isMobile ? '80px' : '120px',
            backgroundColor: isToday ? 'rgba(83, 52, 131, 0.3)' : 'transparent',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            border: isToday ? '2px solid #533483' : '1px solid rgba(255,255,255,0.1)',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isToday ? 'rgba(83, 52, 131, 0.3)' : 'transparent';
          }}
        >
          <div style={{
            fontWeight: isToday ? 'bold' : 'normal',
            color: isToday ? '#a855f7' : '#e0e0e0',
            marginBottom: '4px',
            fontSize: isMobile ? '12px' : '14px'
          }}>
            {day}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {dayEvents.map(event => (
              <div
                key={event.id}
                className={newEventId === event.id ? 'bounce-in' : ''}
                style={{
                  backgroundColor: event.color,
                  color: '#1a1a2e',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: isMobile ? '10px' : '12px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: '500',
                  transform: newEventId === event.id ? 'scale(1)' : undefined,
                  opacity: newEventId === event.id ? 1 : undefined
                }}
                title={`${event.city} - ${event.venue}`}
              >
                {isMobile ? event.city : `${event.city} · ${event.venue}`}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  const renderListView = () => {
    const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sortedEvents.map(event => (
          <div
            key={event.id}
            style={{
              backgroundColor: '#16213e',
              borderRadius: '12px',
              padding: '16px',
              borderLeft: `6px solid ${event.color}`
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
              {event.city} - {event.venue}
            </div>
            <div style={{ color: '#a0a0c0', fontSize: '14px' }}>
              📅 {event.date} | ⏰ {event.startTime} | 👥 {event.expectedAttendance}人
            </div>
            {event.notes && (
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#888' }}>
                备注: {event.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>
          📅 {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handlePrevMonth}
            style={{
              padding: '8px 16px',
              backgroundColor: '#533483',
              color: 'white',
              fontSize: '16px'
            }}
          >
            ←
          </button>
          <button
            onClick={handleNextMonth}
            style={{
              padding: '8px 16px',
              backgroundColor: '#533483',
              color: 'white',
              fontSize: '16px'
            }}
          >
            →
          </button>
        </div>
      </div>

      {isMobile ? (
        renderListView()
      ) : (
        <div
          style={{
            opacity: isAnimating ? 0 : 1,
            transform: isAnimating ? 'translateX(20px)' : 'translateX(0)',
            transition: 'opacity 0.15s ease, transform 0.15s ease'
          }}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px',
            marginBottom: '8px'
          }}>
            {WEEKDAYS.map(day => (
              <div
                key={day}
                style={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  padding: '12px',
                  color: '#a0a0c0',
                  fontSize: '14px'
                }}
              >
                {day}
              </div>
            ))}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px'
          }}>
            {renderCalendarGrid()}
          </div>
        </div>
      )}

      {showModal && (
        <>
          <div
            onClick={() => setShowModal(false)}
            className="fade-in"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: 2000
            }}
          />
          <div
            className="scale-in"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              color: '#1a1a2e',
              padding: '30px',
              borderRadius: '12px',
              width: isMobile ? '90%' : '450px',
              maxHeight: '90vh',
              overflowY: 'auto',
              zIndex: 2001,
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
            }}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: '#1a1a2e' }}>
              创建演出日程 - {selectedDate}
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>城市 *</label>
                <input
                  type="text"
                  value={newEvent.city}
                  onChange={(e) => setNewEvent({ ...newEvent, city: e.target.value })}
                  required
                  style={{ width: '100%', backgroundColor: '#f5f5f5', color: '#1a1a2e', border: '1px solid #ddd' }}
                  placeholder="例如：北京"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>场馆 *</label>
                <input
                  type="text"
                  value={newEvent.venue}
                  onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                  required
                  style={{ width: '100%', backgroundColor: '#f5f5f5', color: '#1a1a2e', border: '1px solid #ddd' }}
                  placeholder="例如：工人体育馆"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>开始时间 *</label>
                  <input
                    type="time"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    required
                    style={{ width: '100%', backgroundColor: '#f5f5f5', color: '#1a1a2e', border: '1px solid #ddd' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>预计人数</label>
                  <input
                    type="number"
                    value={newEvent.expectedAttendance || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, expectedAttendance: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', backgroundColor: '#f5f5f5', color: '#1a1a2e', border: '1px solid #ddd' }}
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>备注</label>
                <textarea
                  value={newEvent.notes}
                  onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                  rows={3}
                  style={{ width: '100%', backgroundColor: '#f5f5f5', color: '#1a1a2e', border: '1px solid #ddd', resize: 'vertical' }}
                  placeholder="演出相关备注..."
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#e0e0e0',
                    color: '#333',
                    fontWeight: '500'
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#533483',
                    color: 'white',
                    fontWeight: '500'
                  }}
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default CalendarPage;
