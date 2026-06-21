import React, { useState, useRef, useMemo, useEffect } from 'react';
import type { Member, TimeSlot, Event as CalendarEvent, ConflictResult } from './utils/conflictDetection';

interface CalendarViewProps {
  viewMode: 'day' | 'week' | 'month';
  currentDate: Date;
  members: Member[];
  slots: TimeSlot[];
  events: CalendarEvent[];
  currentMember: Member | null;
  slotMode: boolean;
  conflictResult: ConflictResult | null;
  onAddSlot: (startTime: string, endTime: string) => void;
  onDeleteSlot: (slotId: string) => void;
  onUpdateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  onDeleteEvent: (id: string) => void;
}

const HOUR_HEIGHT = 50;
const START_HOUR = 0;
const END_HOUR = 24;
const SLOT_MINUTES = 30;

const categoryColors: Record<string, string> = {
  work: '#dd6b20',
  personal: '#805ad5',
  team: '#3182ce',
};

const CalendarView: React.FC<CalendarViewProps> = ({
  viewMode,
  currentDate,
  members,
  slots,
  events,
  currentMember,
  slotMode,
  conflictResult,
  onAddSlot,
  onDeleteSlot,
  onUpdateEvent,
  onDeleteEvent,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ date: Date; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ date: Date; y: number } | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [dragOffset, setDragOffset] = useState({ y: 0 });
  const [selectedSlotInfo, setSelectedSlotInfo] = useState<{
    x: number;
    y: number;
    time: string;
    available: number;
    conflict: { name: string; overlap: number }[];
  } | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const start = new Date(currentDate);
    const day = start.getDay() === 0 ? 6 : start.getDay() - 1;
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  const monthDays = useMemo(() => {
    const days: Date[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push(d);
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
    return days;
  }, [currentDate]);

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  };

  const isToday = (d: Date) => isSameDay(d, new Date());

  const getMemberColor = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.color || '#ccc';
  };

  const yToTime = (y: number): number => {
    const totalHours = END_HOUR - START_HOUR;
    const hour = (y / HOUR_HEIGHT) + START_HOUR;
    return Math.max(START_HOUR, Math.min(END_HOUR, hour));
  };

  const timeToY = (hour: number): number => {
    return (hour - START_HOUR) * HOUR_HEIGHT;
  };

  const snapToSlot = (hour: number): number => {
    const minutes = hour * 60;
    const snapped = Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES;
    return snapped / 60;
  };

  const handleGridMouseDown = (e: React.MouseEvent, date: Date) => {
    if (!slotMode || !currentMember) return;
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hour = snapToSlot(yToTime(y));
    setIsDragging(true);
    setDragStart({ date: new Date(date), y: hour });
    setDragEnd({ date: new Date(date), y: hour + 0.5 });
  };

  const handleGridMouseMove = (e: React.MouseEvent, date: Date) => {
    if (!isDragging || !dragStart) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hour = snapToSlot(yToTime(y));
    setDragEnd({ date: new Date(date), y: hour });
  };

  const handleGridMouseUp = () => {
    if (isDragging && dragStart && dragEnd && currentMember) {
      const startHour = Math.min(dragStart.y, dragEnd.y);
      const endHour = Math.max(dragStart.y, dragEnd.y);
      if (endHour - startHour >= 0.5) {
        const startDate = new Date(dragStart.date);
        startDate.setHours(Math.floor(startHour), (startHour % 1) * 60, 0, 0);
        const endDate = new Date(dragEnd.date);
        endDate.setHours(Math.floor(endHour), (endHour % 1) * 60, 0, 0);
        onAddSlot(startDate.toISOString(), endDate.toISOString());
      }
    }
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const handleEventDragStart = (e: React.MouseEvent, event: CalendarEvent) => {
    if (slotMode) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggedEvent(event);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({ y: e.clientY - rect.top });
    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);
  };

  const handleDocumentMouseMove = (e: MouseEvent) => {
    if (!draggedEvent || !calendarRef.current) return;
  };

  const handleDocumentMouseUp = () => {
    if (draggedEvent) {
    }
    setDraggedEvent(null);
    document.removeEventListener('mousemove', handleDocumentMouseMove);
    document.removeEventListener('mouseup', handleDocumentMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [draggedEvent]);

  const handleSlotClick = (e: React.MouseEvent, slot: TimeSlot) => {
    if (slotMode && currentMember?.id === slot.member_id) {
      e.stopPropagation();
      if (confirm('删除这个空闲时段？')) {
        onDeleteSlot(slot.id);
      }
    }
  };

  const handleConflictSlotClick = (e: React.MouseEvent, slot: { start: string; end: string }, type: 'available' | 'partial') => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const startTime = new Date(slot.start);
    const endTime = new Date(slot.end);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    
    let availableCount = members.length;
    let conflictList: { name: string; overlap: number }[] = [];

    if (type === 'partial' && conflictResult) {
      const partial = conflictResult.partialConflicts.find(
        p => p.start === slot.start && p.end === slot.end
      );
      if (partial) {
        availableCount = partial.availableCount;
        conflictList = partial.conflictMembers.map(c => ({ name: c.name, overlap: c.overlapMinutes }));
      }
    }

    setSelectedSlotInfo({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      time: `${formatTime(slot.start)} - ${formatTime(slot.end)}`,
      available: availableCount,
      conflict: conflictList,
    });
  };

  useEffect(() => {
    const handleClick = () => setSelectedSlotInfo(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const formatTime = (isoStr: string) => {
    const d = new Date(isoStr);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      arr.push(h);
    }
    return arr;
  }, []);

  const renderDayView = () => {
    const daySlots = slots.filter(s => isSameDay(new Date(s.start_time), currentDate));
    const dayEvents = events.filter(e => isSameDay(new Date(e.start_time), currentDate));

    return (
      <div style={styles.dayView}>
        <div style={styles.timeColumn}>
          {hours.map(h => (
            <div key={h} style={styles.timeLabel}>
              {h.toString().padStart(2, '0')}:00
            </div>
          ))}
        </div>
        <div
          style={{
            ...styles.dayColumn,
            cursor: slotMode ? 'crosshair' : 'default',
          }}
          onMouseDown={(e) => handleGridMouseDown(e, currentDate)}
          onMouseMove={(e) => handleGridMouseMove(e, currentDate)}
          onMouseUp={handleGridMouseUp}
          onMouseLeave={handleGridMouseUp}
        >
          {hours.slice(0, -1).map(h => (
            <div key={h} style={styles.hourRow}></div>
          ))}
          
          {conflictResult?.availableSlots
            .filter(s => isSameDay(new Date(s.start), currentDate))
            .map((slot, i) => {
              const startHour = new Date(s.start).getHours() + new Date(s.start).getMinutes() / 60;
              const endHour = new Date(s.end).getHours() + new Date(s.end).getMinutes() / 60;
              return (
                <div
                  key={`avail-${i}`}
                  style={{
                    ...styles.availableSlot,
                    top: timeToY(startHour),
                    height: timeToY(endHour) - timeToY(startHour),
                  }}
                  onClick={(e) => handleConflictSlotClick(e, slot, 'available')}
                />
              );
            })}

          {conflictResult?.partialConflicts
            .filter(p => isSameDay(new Date(p.start), currentDate))
            .map((partial, i) => {
              const startHour = new Date(partial.start).getHours() + new Date(partial.start).getMinutes() / 60;
              const endHour = new Date(partial.end).getHours() + new Date(partial.end).getMinutes() / 60;
              return (
                <div
                  key={`partial-${i}`}
                  style={{
                    ...styles.partialConflictSlot,
                    top: timeToY(startHour),
                    height: timeToY(endHour) - timeToY(startHour),
                  }}
                  onClick={(e) => handleConflictSlotClick(e, { start: partial.start, end: partial.end }, 'partial')}
                />
              );
            })}

          {daySlots.map(slot => {
            const startDate = new Date(slot.start_time);
            const endDate = new Date(slot.end_time);
            const startHour = startDate.getHours() + startDate.getMinutes() / 60;
            const endHour = endDate.getHours() + endDate.getMinutes() / 60;
            const color = getMemberColor(slot.member_id);
            return (
              <div
                key={slot.id}
                style={{
                  ...styles.slotBlock,
                  top: timeToY(startHour),
                  height: timeToY(endHour) - timeToY(startHour),
                  backgroundColor: color,
                  opacity: currentMember?.id === slot.member_id ? 0.7 : 0.4,
                  cursor: slotMode && currentMember?.id === slot.member_id ? 'pointer' : 'default',
                }}
                onClick={(e) => handleSlotClick(e, slot)}
              >
                {members.find(m => m.id === slot.member_id)?.name}
              </div>
            );
          })}

          {dayEvents.map(event => {
            const startDate = new Date(event.start_time);
            const endDate = new Date(event.end_time);
            const startHour = startDate.getHours() + startDate.getMinutes() / 60;
            const endHour = endDate.getHours() + endDate.getMinutes() / 60;
            return (
              <div
                key={event.id}
                style={{
                  ...styles.eventBlock,
                  top: timeToY(startHour),
                  height: Math.max(timeToY(endHour) - timeToY(startHour) - 4, 24),
                  cursor: 'move',
                }}
                onMouseDown={(e) => handleEventDragStart(e, event)}
                title={event.title}
              >
                <div
                  style={{
                    ...styles.eventTag,
                    backgroundColor: categoryColors[event.category],
                  }}
                />
                <span style={styles.eventTitle}>{event.title}</span>
              </div>
            );
          })}

          {isDragging && dragStart && dragEnd && (
            <div
              style={{
                ...styles.dragPreview,
                top: timeToY(Math.min(dragStart.y, dragEnd.y)),
                height: timeToY(Math.abs(dragEnd.y - dragStart.y)),
                backgroundColor: currentMember?.color || '#3182ce',
              }}
            />
          )}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    return (
      <div style={styles.weekView}>
        <div style={styles.weekHeader}>
          <div style={{ ...styles.weekHeaderCell, width: 60 }}></div>
          {weekDays.map((day, i) => (
            <div
              key={i}
              style={{
                ...styles.weekHeaderCell,
                ...(isToday(day) ? styles.todayHeader : {}),
              }}
            >
              <div style={styles.weekDayName}>
                {['一', '二', '三', '四', '五', '六', '日'][i]}
              </div>
              <div style={{ ...styles.weekDayNum, ...(isToday(day) ? styles.todayNum : {}) }}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>
        <div style={styles.weekBody}>
          <div style={styles.timeColumn}>
            {hours.map(h => (
              <div key={h} style={styles.timeLabel}>
                {h.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
          <div style={styles.weekDaysContainer}>
            {weekDays.map((day, dayIdx) => {
              const daySlots = slots.filter(s => isSameDay(new Date(s.start_time), day));
              const dayEvents = events.filter(e => isSameDay(new Date(e.start_time), day));
              return (
                <div
                  key={dayIdx}
                  style={{
                    ...styles.weekDayColumn,
                    ...(isToday(day) ? styles.todayColumn : {}),
                    cursor: slotMode ? 'crosshair' : 'default',
                  }}
                  onMouseDown={(e) => handleGridMouseDown(e, day)}
                  onMouseMove={(e) => handleGridMouseMove(e, day)}
                  onMouseUp={handleGridMouseUp}
                  onMouseLeave={handleGridMouseUp}
                >
                  {hours.slice(0, -1).map(h => (
                    <div key={h} style={styles.hourRow}></div>
                  ))}

                  {conflictResult?.availableSlots
                    .filter(s => isSameDay(new Date(s.start), day))
                    .map((slot, i) => {
                      const startHour = new Date(s.start).getHours() + new Date(s.start).getMinutes() / 60;
                      const endHour = new Date(s.end).getHours() + new Date(s.end).getMinutes() / 60;
                      return (
                        <div
                          key={`avail-${dayIdx}-${i}`}
                          style={{
                            ...styles.availableSlot,
                            top: timeToY(startHour),
                            height: timeToY(endHour) - timeToY(startHour),
                            left: 4,
                            right: 4,
                            width: 'auto',
                          }}
                          onClick={(e) => handleConflictSlotClick(e, slot, 'available')}
                        />
                      );
                    })}

                  {conflictResult?.partialConflicts
                    .filter(p => isSameDay(new Date(p.start), day))
                    .map((partial, i) => {
                      const startHour = new Date(partial.start).getHours() + new Date(partial.start).getMinutes() / 60;
                      const endHour = new Date(partial.end).getHours() + new Date(partial.end).getMinutes() / 60;
                      return (
                        <div
                          key={`partial-${dayIdx}-${i}`}
                          style={{
                            ...styles.partialConflictSlot,
                            top: timeToY(startHour),
                            height: timeToY(endHour) - timeToY(startHour),
                            left: 4,
                            right: 4,
                            width: 'auto',
                          }}
                          onClick={(e) => handleConflictSlotClick(e, { start: partial.start, end: partial.end }, 'partial')}
                        />
                      );
                    })}

                  {daySlots.map(slot => {
                    const startDate = new Date(slot.start_time);
                    const endDate = new Date(slot.end_time);
                    const startHour = startDate.getHours() + startDate.getMinutes() / 60;
                    const endHour = endDate.getHours() + endDate.getMinutes() / 60;
                    const color = getMemberColor(slot.member_id);
                    return (
                      <div
                        key={slot.id}
                        style={{
                          ...styles.slotBlock,
                          top: timeToY(startHour),
                          height: timeToY(endHour) - timeToY(startHour),
                          backgroundColor: color,
                          opacity: currentMember?.id === slot.member_id ? 0.7 : 0.4,
                          left: 4,
                          right: 4,
                          width: 'auto',
                          cursor: slotMode && currentMember?.id === slot.member_id ? 'pointer' : 'default',
                        }}
                        onClick={(e) => handleSlotClick(e, slot)}
                      />
                    );
                  })}

                  {dayEvents.map(event => {
                    const startDate = new Date(event.start_time);
                    const endDate = new Date(event.end_time);
                    const startHour = startDate.getHours() + startDate.getMinutes() / 60;
                    const endHour = endDate.getHours() + endDate.getMinutes() / 60;
                    return (
                      <div
                        key={event.id}
                        style={{
                          ...styles.eventBlock,
                          top: timeToY(startHour),
                          height: Math.max(timeToY(endHour) - timeToY(startHour) - 4, 20),
                          left: 4,
                          right: 4,
                          width: 'auto',
                          cursor: 'move',
                          fontSize: '11px',
                        }}
                        onMouseDown={(e) => handleEventDragStart(e, event)}
                        title={event.title}
                      >
                        <div
                          style={{
                            ...styles.eventTag,
                            backgroundColor: categoryColors[event.category],
                          }}
                        />
                        <span style={{ ...styles.eventTitle, fontSize: '11px' }}>{event.title}</span>
                      </div>
                    );
                  })}

                  {isDragging && dragStart && dragEnd && isSameDay(dragStart.date, day) && (
                    <div
                      style={{
                        ...styles.dragPreview,
                        top: timeToY(Math.min(dragStart.y, dragEnd.y)),
                        height: timeToY(Math.abs(dragEnd.y - dragStart.y)),
                        backgroundColor: currentMember?.color || '#3182ce',
                        left: 4,
                        right: 4,
                        width: 'auto',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    return (
      <div style={styles.monthView}>
        <div style={styles.monthHeader}>
          {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((day, i) => (
            <div key={i} style={styles.monthHeaderCell}>
              {day}
            </div>
          ))}
        </div>
        <div style={styles.monthGrid}>
          {monthDays.map((day, i) => {
            const daySlots = slots.filter(s => isSameDay(new Date(s.start_time), day));
            const dayEvents = events.filter(e => isSameDay(new Date(e.start_time), day));
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            return (
              <div
                key={i}
                style={{
                  ...styles.monthDayCell,
                  ...(!isCurrentMonth ? styles.otherMonthCell : {}),
                  ...(isToday(day) ? styles.todayMonthCell : {}),
                }}
              >
                <div style={{
                  ...styles.monthDayNumber,
                  ...(isToday(day) ? styles.todayMonthNumber : {}),
                }}>
                  {day.getDate()}
                </div>
                <div style={styles.monthDayContent}>
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      style={{
                        ...styles.monthEvent,
                        borderLeftColor: categoryColors[event.category],
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div style={styles.monthMore}>+{dayEvents.length - 3} 更多</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div ref={calendarRef} style={styles.calendarWrapper}>
      <div style={{
        ...styles.calendarContainer,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}
      </div>

      {selectedSlotInfo && (
        <div
          style={{
            ...styles.popupCard,
            left: selectedSlotInfo.x,
            top: selectedSlotInfo.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={styles.popupTime}>{selectedSlotInfo.time}</div>
          <div style={styles.popupRow}>
            <span style={{ color: '#38a169' }}>✓ {selectedSlotInfo.available} 人空闲</span>
          </div>
          {selectedSlotInfo.conflict.length > 0 && (
            <>
              <div style={styles.popupDivider}></div>
              <div style={styles.popupSubtitle}>冲突成员：</div>
              {selectedSlotInfo.conflict.map((c, i) => (
                <div key={i} style={styles.popupConflictItem}>
                  <span>{c.name}</span>
                  <span style={styles.popupOverlap}>重叠 {c.overlap} 分钟</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  calendarWrapper: {
    position: 'relative',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  calendarContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  dayView: {
    display: 'flex',
    height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px`,
    overflowY: 'auto',
  },
  weekView: {
    display: 'flex',
    flexDirection: 'column',
    height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT + 60}px`,
    overflowY: 'auto',
  },
  weekHeader: {
    display: 'flex',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f7fafc',
  },
  weekHeaderCell: {
    flex: 1,
    padding: '10px',
    textAlign: 'center',
    minWidth: 0,
  },
  weekDayName: {
    fontSize: '12px',
    color: '#718096',
    marginBottom: '2px',
  },
  weekDayNum: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
  },
  todayHeader: {
    backgroundColor: 'rgba(49, 130, 206, 0.05)',
  },
  todayNum: {
    color: '#3182ce',
  },
  weekBody: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  weekDaysContainer: {
    display: 'flex',
    flex: 1,
    minWidth: 0,
  },
  weekDayColumn: {
    position: 'relative',
    flex: 1,
    borderLeft: '1px solid #e2e8f0',
    minWidth: 0,
    height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px`,
  },
  todayColumn: {
    backgroundColor: 'rgba(49, 130, 206, 0.03)',
  },
  timeColumn: {
    width: 60,
    flexShrink: 0,
    borderRight: '1px solid #e2e8f0',
    position: 'relative',
  },
  timeLabel: {
    height: HOUR_HEIGHT,
    fontSize: '11px',
    color: '#a0aec0',
    textAlign: 'right',
    paddingRight: '8px',
    paddingTop: '2px',
    boxSizing: 'border-box',
  },
  dayColumn: {
    flex: 1,
    position: 'relative',
    height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px`,
  },
  hourRow: {
    height: HOUR_HEIGHT,
    borderBottom: '1px solid #e2e8f0',
    boxSizing: 'border-box',
  },
  slotBlock: {
    position: 'absolute',
    left: 0,
    width: '100%',
    borderRadius: '4px',
    fontSize: '11px',
    color: 'white',
    padding: '4px 6px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    zIndex: 1,
    transition: 'opacity 0.2s ease',
  },
  availableSlot: {
    position: 'absolute',
    left: 0,
    width: '100%',
    background: 'linear-gradient(to bottom, #38a169, #68d391)',
    opacity: 0.3,
    borderRadius: '4px',
    cursor: 'pointer',
    zIndex: 2,
    transition: 'opacity 0.2s ease',
  },
  partialConflictSlot: {
    position: 'absolute',
    left: 0,
    width: '100%',
    background: 'repeating-linear-gradient(45deg, #ecc94b, #ecc94b 4px, #faf089 4px, #faf089 8px)',
    opacity: 0.5,
    borderRadius: '4px',
    cursor: 'pointer',
    zIndex: 2,
    transition: 'opacity 0.2s ease',
  },
  eventBlock: {
    position: 'absolute',
    left: 4,
    right: 4,
    backgroundColor: '#2b6cb0',
    color: 'white',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '12px',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    zIndex: 3,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease',
  },
  eventTag: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  eventTitle: {
    fontSize: '12px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dragPreview: {
    position: 'absolute',
    left: 0,
    width: '100%',
    opacity: 0.5,
    borderRadius: '4px',
    border: '2px dashed rgba(255, 255, 255, 0.5)',
    boxSizing: 'border-box',
    zIndex: 10,
    pointerEvents: 'none',
  },
  monthView: {
    display: 'flex',
    flexDirection: 'column',
    height: 'auto',
    minHeight: '500px',
  },
  monthHeader: {
    display: 'flex',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f7fafc',
  },
  monthHeaderCell: {
    flex: 1,
    padding: '10px',
    textAlign: 'center',
    fontSize: '12px',
    fontWeight: '500',
    color: '#718096',
  },
  monthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    flex: 1,
  },
  monthDayCell: {
    borderRight: '1px solid #e2e8f0',
    borderBottom: '1px solid #e2e8f0',
    padding: '8px',
    minHeight: '100px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  otherMonthCell: {
    backgroundColor: '#f7fafc',
    opacity: 0.5,
  },
  todayMonthCell: {
    backgroundColor: 'rgba(49, 130, 206, 0.05)',
  },
  monthDayNumber: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#4a5568',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
  },
  todayMonthNumber: {
    backgroundColor: '#3182ce',
    color: 'white',
  },
  monthDayContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    overflow: 'hidden',
  },
  monthEvent: {
    fontSize: '11px',
    padding: '2px 6px',
    backgroundColor: '#ebf4ff',
    borderLeft: '3px solid #3182ce',
    borderRadius: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  },
  monthMore: {
    fontSize: '10px',
    color: '#718096',
    paddingLeft: '9px',
  },
  popupCard: {
    position: 'fixed',
    transform: 'translate(-50%, -100%)',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    padding: '12px 16px',
    minWidth: '200px',
    zIndex: 100,
    animation: 'fadeIn 0.2s ease',
  },
  popupTime: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '8px',
  },
  popupRow: {
    fontSize: '12px',
    color: '#4a5568',
  },
  popupDivider: {
    height: '1px',
    backgroundColor: '#e2e8f0',
    margin: '8px 0',
  },
  popupSubtitle: {
    fontSize: '11px',
    color: '#718096',
    marginBottom: '4px',
  },
  popupConflictItem: {
    fontSize: '12px',
    color: '#c53030',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '2px 0',
  },
  popupOverlap: {
    fontSize: '11px',
    color: '#a0aec0',
  },
};

export default CalendarView;
