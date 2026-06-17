import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isSameDay, startOfDay, addDays } from 'date-fns';
import zhCN from 'date-fns/locale/zh-CN';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useApp } from '../context/AppContext';
import { scheduleApi, materialApi } from '../api';
import type { Schedule, ScheduleStatus, PlatformType } from '../types';
import ScheduleModal from './ScheduleModal';
import './CalendarView.css';

const locales = {
  'zh-CN': zhCN,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const PLATFORM_INFO: Record<PlatformType, { name: string; color: string; icon: string }> = {
  weibo: { name: '微博', color: '#E6162D', icon: 'W' },
  xiaohongshu: { name: '小红书', color: '#FE2C55', icon: '小' },
  wechat: { name: '公众号', color: '#07C160', icon: '公' },
};

const STATUS_INFO: Record<ScheduleStatus, { name: string; color: string }> = {
  draft: { name: '草稿', color: '#95A5A6' },
  scheduled: { name: '待发布', color: '#3498DB' },
  published: { name: '已发布', color: '#27AE60' },
};

const CalendarView: React.FC = () => {
  const { schedules, fetchSchedules, setSelectedSchedule, materials, fetchMaterials } = useApp();
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [view, setView] = useState<View>(Views.MONTH);
  const [isMobile, setIsMobile] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchSchedules();
    fetchMaterials();
  }, [fetchSchedules, fetchMaterials]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth <= 768) {
        setView(Views.WEEK);
      } else {
        setView(Views.MONTH);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const events = useMemo(() => {
    return schedules.map((schedule) => {
      const date = new Date(schedule.publishDate);
      return {
        id: schedule.id,
        title: schedule.title,
        start: date,
        end: date,
        allDay: true,
        resource: schedule,
      };
    });
  }, [schedules]);

  const daySchedules = useMemo(() => {
    if (!selectedDate) return [];
    return schedules
      .filter((s) => isSameDay(new Date(s.publishDate), selectedDate))
      .sort((a, b) => a.order - b.order);
  }, [schedules, selectedDate]);

  const getCountForDate = (date: Date) => {
    return schedules.filter((s) => isSameDay(new Date(s.publishDate), date)).length;
  };

  const dayPropGetter = (date: Date) => {
    const count = getCountForDate(date);
    return {
      className: count > 0 ? 'rbc-day-with-events' : '',
    };
  };

  const eventPropGetter = (event: any) => {
    const schedule = event.resource as Schedule;
    const platformInfo = PLATFORM_INFO[schedule.platform];
    return {
      style: {
        backgroundColor: platformInfo.color,
        borderRadius: 4,
        fontSize: 12,
        padding: '2px 6px',
      },
    };
  };

  const handleSelectSlot = (slotInfo: { start: Date }) => {
    setSelectedDate(slotInfo.start);
  };

  const handleSelectEvent = (event: any) => {
    const schedule = event.resource as Schedule;
    setEditingSchedule(schedule);
    setShowModal(true);
    setSelectedSchedule(schedule);
  };

  const handleEventDrop = async ({ event, start, end }: any) => {
    const schedule = event.resource as Schedule;
    const newDate = start;
    newDate.setHours(new Date(schedule.publishDate).getHours());
    newDate.setMinutes(new Date(schedule.publishDate).getMinutes());
    
    try {
      await scheduleApi.update(schedule.id, {
        publishDate: newDate.toISOString().slice(0, 16),
      });
      fetchSchedules();
    } catch (err) {
      alert('调整日期失败');
    }
  };

  const handleAddSchedule = () => {
    setEditingSchedule(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingSchedule(null);
  };

  const handleScheduleSaved = () => {
    fetchSchedules();
    setShowModal(false);
    setEditingSchedule(null);
  };

  const handleTimelineDragStart = (e: React.DragEvent, scheduleId: string) => {
    setDraggedId(scheduleId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTimelineDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleTimelineDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedId || !selectedDate) {
      setDraggedId(null);
      setDragOverIndex(null);
      return;
    }

    const currentIndex = daySchedules.findIndex((s) => s.id === draggedId);
    if (currentIndex === -1 || currentIndex === targetIndex) {
      setDraggedId(null);
      setDragOverIndex(null);
      return;
    }

    const newSchedules = [...daySchedules];
    const [removed] = newSchedules.splice(currentIndex, 1);
    newSchedules.splice(targetIndex, 0, removed);

    const orderMap: Record<string, number> = {};
    newSchedules.forEach((s, idx) => {
      orderMap[s.id] = idx;
    });

    try {
      await scheduleApi.reorder(selectedDate.toISOString(), orderMap);
      fetchSchedules();
    } catch (err) {
      alert('排序失败');
    }

    setDraggedId(null);
    setDragOverIndex(null);
  };

  const handleScheduleClick = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setShowModal(true);
    setSelectedSchedule(schedule);
  };

  const components = {
    day: {
      event: (props: any) => {
        const schedule = props.event.resource as Schedule;
        const platformInfo = PLATFORM_INFO[schedule.platform];
        return (
          <div className="custom-event">
            <span className="event-icon" style={{ background: platformInfo.color }}>
              {platformInfo.icon}
            </span>
            <span className="event-title">{props.event.title}</span>
          </div>
        );
      },
    },
    month: {
      dateHeader: (props: any) => {
        const count = getCountForDate(props.date);
        return (
          <div className="custom-date-header">
            <span className="date-number">{props.label}</span>
            {count > 0 && (
              <span className="event-badge">{count}</span>
            )}
          </div>
        );
      },
    },
  };

  return (
    <div className="calendar-page">
      <div className="calendar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 className="page-title">排期日历</h2>
          <button className="btn btn-primary btn-sm" onClick={handleAddSchedule}>
            + 新建排期
          </button>
        </div>
        <div className="view-switcher">
          <button
            className={`view-btn ${view === Views.MONTH ? 'active' : ''}`}
            onClick={() => setView(Views.MONTH)}
          >
            月视图
          </button>
          <button
            className={`view-btn ${view === Views.WEEK ? 'active' : ''}`}
            onClick={() => setView(Views.WEEK)}
          >
            周视图
          </button>
        </div>
      </div>

      <div className="calendar-body" ref={calendarRef}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          style={{ height: '100%' }}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          dayPropGetter={dayPropGetter}
          eventPropGetter={eventPropGetter}
          components={components}
          messages={{
            today: '今天',
            previous: '上一页',
            next: '下一页',
            month: '月',
            week: '周',
            day: '日',
            agenda: '日程',
            date: '日期',
            time: '时间',
            event: '事件',
            noEventsInRange: '暂无排期',
          }}
          culture="zh-CN"
          {...({
            draggable: true,
            onEventDrop: handleEventDrop,
          } as any)}
        />
      </div>

      {selectedDate && (
        <div className="timeline-container">
          <div className="timeline-header">
            <h3>
              {format(selectedDate, 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
              <span className="timeline-count">{daySchedules.length} 条排期</span>
            </h3>
          </div>
          <div className="timeline-list">
            {daySchedules.length === 0 ? (
              <div className="empty-state">当日暂无排期，点击"新建排期"添加</div>
            ) : (
              daySchedules.map((schedule, index) => {
                const platformInfo = PLATFORM_INFO[schedule.platform];
                const statusInfo = STATUS_INFO[schedule.status];
                const material = materials.find((m) => m.id === schedule.materialId);
                return (
                  <div
                    key={schedule.id}
                    className={`timeline-item ${draggedId === schedule.id ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                    draggable
                    onDragStart={(e) => handleTimelineDragStart(e, schedule.id)}
                    onDragOver={(e) => handleTimelineDragOver(e, index)}
                    onDrop={(e) => handleTimelineDrop(e, index)}
                    onClick={() => handleScheduleClick(schedule)}
                  >
                    <div className="timeline-time">
                      {format(new Date(schedule.publishDate), 'HH:mm')}
                    </div>
                    <div className="timeline-cover">
                      {schedule.coverImage ? (
                        <img src={schedule.coverImage} alt="" />
                      ) : (
                        <div className="cover-placeholder" style={{ background: platformInfo.color }}>
                          {platformInfo.icon}
                        </div>
                      )}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-title">{schedule.title}</div>
                      <div className="timeline-meta">
                        <span
                          className="platform-tag"
                          style={{ backgroundColor: platformInfo.color + '20', color: platformInfo.color }}
                        >
                          {platformInfo.icon} {platformInfo.name}
                        </span>
                        <span
                          className="status-tag"
                          style={{ backgroundColor: statusInfo.color + '20', color: statusInfo.color }}
                        >
                          {statusInfo.name}
                        </span>
                      </div>
                    </div>
                    <div className="timeline-drag-handle">⋮⋮</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {showModal && (
        <ScheduleModal
          schedule={editingSchedule}
          defaultDate={selectedDate}
          onClose={handleModalClose}
          onSaved={handleScheduleSaved}
        />
      )}
    </div>
  );
};

export default CalendarView;
