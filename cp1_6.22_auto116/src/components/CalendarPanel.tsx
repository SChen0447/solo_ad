import React, { useState, useEffect, useMemo } from 'react';
import type { Holiday, Activity } from '../services/api';
import { api } from '../services/api';
import ActivityCard from './ActivityCard';

interface CalendarPanelProps {
  holidays: Holiday[];
  activities: Activity[];
  onAddActivity: (activity: Activity) => void;
  onUpdateActivity: (activity: Activity) => void;
  onDeleteActivity: (id: string) => void;
  loading: boolean;
}

const CalendarPanel: React.FC<CalendarPanelProps> = ({
  holidays,
  activities,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
  loading
}) => {
  const today = new Date(2026, new Date().getMonth(), new Date().getDate());
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showAddForm, setShowAddForm] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formNote, setFormNote] = useState('');
  const [newActivityId, setNewActivityId] = useState<string | null>(null);
  const [showAllRows, setShowAllRows] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isSmallMobile = windowWidth < 480;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, [firstDayOfWeek, daysInMonth]);

  const getDateKey = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getHolidaysForDate = (dateKey: string) => {
    return holidays.filter(h => h.date === dateKey);
  };

  const getActivitiesForDate = (dateKey: string) => {
    return activities.filter(a => a.date === dateKey);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSlideDirection(direction === 'next' ? 'left' : 'right');
    setSelectedDate(null);
    setShowAddForm(null);
    setShowAllRows(false);

    setTimeout(() => {
      setCurrentDate(prev => {
        const newDate = new Date(prev);
        if (direction === 'next') {
          newDate.setMonth(newDate.getMonth() + 1);
        } else {
          newDate.setMonth(newDate.getMonth() - 1);
        }
        return newDate;
      });
      setSlideDirection(null);
      setTimeout(() => setIsAnimating(false), 50);
    }, 300);
  };

  const handleDateClick = (day: number) => {
    const dateKey = getDateKey(day);
    if (selectedDate === dateKey) {
      setSelectedDate(null);
      setShowAddForm(null);
    } else {
      setSelectedDate(dateKey);
      setShowAddForm(null);
    }
  };

  const handleAddActivity = async (holidayId: string, date: string) => {
    if (!formTitle.trim()) return;

    try {
      const newActivity = await api.createActivity({
        holidayId,
        date,
        title: formTitle.trim(),
        note: formNote.trim()
      });

      onAddActivity(newActivity);
      setNewActivityId(newActivity.id);
      setFormTitle('');
      setFormNote('');
      setShowAddForm(null);

      setTimeout(() => setNewActivityId(null), 500);
    } catch (error) {
      console.error('创建活动失败:', error);
    }
  };

  const visibleDays = isSmallMobile && !showAllRows ? calendarDays.slice(0, 28) : calendarDays;
  const hasHiddenDays = isSmallMobile && calendarDays.length > 28;

  const getTranslateX = () => {
    if (slideDirection === 'left') return '-100%';
    if (slideDirection === 'right') return '100%';
    return '0';
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e5e7eb',
          borderTopColor: '#6b7280',
          borderRadius: '50%',
          animation: 'spin 1.2s linear infinite'
        }} />
      </div>
    );
  }

  return (
    <div className="calendar-panel" style={{ width: '100%' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        padding: '0 8px'
      }}>
        <button
          onClick={() => navigateMonth('prev')}
          className="nav-btn"
          style={{
            width: isMobile ? '32px' : '40px',
            height: isMobile ? '32px' : '40px',
            borderRadius: '50%',
            backgroundColor: '#e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isMobile ? '14px' : '16px',
            transition: 'all 200ms ease'
          }}
        >
          ◀
        </button>

        <h2 style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#1f2937'
        }}>
          {year}年{monthNames[month]}
        </h2>

        <button
          onClick={() => navigateMonth('next')}
          className="nav-btn"
          style={{
            width: isMobile ? '32px' : '40px',
            height: isMobile ? '32px' : '40px',
            borderRadius: '50%',
            backgroundColor: '#e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isMobile ? '14px' : '16px',
            transition: 'all 200ms ease'
          }}
        >
          ▶
        </button>
      </div>

      <div className="weekdays" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '8px',
        marginBottom: '8px',
        padding: '0 4px'
      }}>
        {weekDays.map(day => (
          <div key={day} style={{
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: 600,
            color: '#6b7280',
            padding: '8px 0'
          }}>
            {day}
          </div>
        ))}
      </div>

      <div
        className="calendar-grid-container"
        style={{
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div
          className="calendar-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '8px',
            padding: '4px',
            transform: `translateX(${getTranslateX()})`,
            transition: 'transform 300ms ease',
            opacity: slideDirection ? 0.5 : 1
          }}
        >
          {visibleDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} style={{ aspectRatio: '1/1' }} />;
            }

            const dateKey = getDateKey(day);
            const dayHolidays = getHolidaysForDate(dateKey);
            const dayActivities = getActivitiesForDate(dateKey);
            const hasContent = dayHolidays.length > 0 || dayActivities.length > 0;
            const isSelected = selectedDate === dateKey;

            return (
              <div key={dateKey} style={{ position: 'relative' }}>
                <div
                  className={`date-cell ${isSelected ? 'selected' : ''} ${hasContent ? 'has-holiday' : ''}`}
                  onClick={() => handleDateClick(day)}
                  style={{
                    aspectRatio: '1/1',
                    maxWidth: isMobile ? '60px' : '120px',
                    maxHeight: isMobile ? '60px' : '120px',
                    borderRadius: '8px',
                    backgroundColor: hasContent ? '#fef3c7' : 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                    border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
                    position: 'relative',
                    width: '100%'
                  }}
                >
                  <span style={{
                    fontSize: isMobile ? '14px' : '16px',
                    fontWeight: hasContent ? 600 : 400,
                    color: '#1f2937'
                  }}>
                    {day}
                  </span>
                  {hasContent && (
                    <div style={{
                      display: 'flex',
                      gap: '2px',
                      marginTop: '2px',
                      fontSize: isMobile ? '8px' : '10px'
                    }}>
                      {dayHolidays.slice(0, 2).map(h => (
                        <span key={h.id}>{h.countryFlag}</span>
                      ))}
                      {dayActivities.length > 0 && (
                        <span>📌</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {hasHiddenDays && (
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <button
            onClick={() => setShowAllRows(!showAllRows)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#e5e7eb',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#4b5563',
              transition: 'all 200ms ease'
            }}
          >
            {showAllRows ? '收起' : '展开更多'}
          </button>
        </div>
      )}

      {selectedDate && (
        <div
          className="expanded-panel"
          style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            overflow: 'hidden',
            animation: 'expandDown 300ms ease-out'
          }}
        >
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '12px'
          }}>
            📅 {selectedDate} 的活动
          </h3>

          {getHolidaysForDate(selectedDate).length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#6b7280',
                marginBottom: '8px'
              }}>
                节日庆典
              </h4>
              {getHolidaysForDate(selectedDate).map(holiday => (
                <div
                  key={holiday.id}
                  className="holiday-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <span style={{ fontSize: '24px' }}>{holiday.countryFlag}</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
                        {holiday.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                        {holiday.description}
                      </div>
                    </div>
                  </div>
                  <button
                    className="add-activity-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddForm(showAddForm === holiday.id ? null : holiday.id);
                      setFormTitle('');
                      setFormNote('');
                    }}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 600,
                      transition: 'all 200ms ease',
                      flexShrink: 0
                    }}
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          )}

          {getHolidaysForDate(selectedDate).length === 0 && (
            <div style={{ marginBottom: '16px' }}>
              <button
                onClick={() => {
                  setShowAddForm(showAddForm === 'general' ? null : 'general');
                  setFormTitle('');
                  setFormNote('');
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#eff6ff',
                  border: '2px dashed #93c5fd',
                  borderRadius: '8px',
                  color: '#3b82f6',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 200ms ease'
                }}
              >
                + 添加活动
              </button>
            </div>
          )}

          {showAddForm && (
            <div
              className="activity-form"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                marginBottom: '16px',
                animation: 'slideUp 250ms ease-out'
              }}
            >
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="活动标题"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  marginBottom: '12px',
                  outline: 'none',
                  transition: 'border-color 200ms ease'
                }}
              />
              <textarea
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="活动备注（可选）"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  height: '80px',
                  resize: 'none',
                  marginBottom: '12px',
                  outline: 'none',
                  transition: 'border-color 200ms ease'
                }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowAddForm(null);
                    setFormTitle('');
                    setFormNote('');
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#4b5563',
                    transition: 'all 200ms ease'
                  }}
                >
                  取消
                </button>
                <button
                  onClick={() => handleAddActivity(showAddForm === 'general' ? '' : showAddForm, selectedDate)}
                  disabled={!formTitle.trim()}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'all 200ms ease',
                    opacity: formTitle.trim() ? 1 : 0.5,
                    cursor: formTitle.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  创建活动
                </button>
              </div>
            </div>
          )}

          {getActivitiesForDate(selectedDate).length > 0 && (
            <div>
              <h4 style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#6b7280',
                marginBottom: '12px'
              }}>
                我的活动
              </h4>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                {getActivitiesForDate(selectedDate).map(activity => (
                  <div
                    key={activity.id}
                    style={{
                      width: isMobile ? '100%' : 'auto',
                      animation: newActivityId === activity.id ? 'slideInTop 200ms ease-out' : 'none'
                    }}
                  >
                    <ActivityCard
                      activity={activity}
                      onUpdate={onUpdateActivity}
                      onDelete={onDeleteActivity}
                      isNew={newActivityId === activity.id}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {getHolidaysForDate(selectedDate).length === 0 && getActivitiesForDate(selectedDate).length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '32px',
              color: '#9ca3af'
            }}>
              该日期暂无活动
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes expandDown {
          from { max-height: 0; opacity: 0; padding: 0 16px; }
          to { max-height: 2000px; opacity: 1; padding: 16px; }
        }
        
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slideInTop {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .date-cell:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .nav-btn:hover {
          background-color: #d1d5db !important;
        }
        
        .add-activity-btn:hover {
          background-color: #2563eb !important;
          transform: scale(1.1);
        }
        
        input:focus, textarea:focus {
          border-color: #3b82f6 !important;
        }
        
        @media (max-width: 767px) {
          .activity-card {
            max-width: 100% !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CalendarPanel;
