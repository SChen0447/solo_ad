import React, { useState, useMemo, useCallback } from 'react';
import {
  addDays,
  startOfDay,
  format,
  parseISO,
  isSameMinute,
} from 'date-fns';
import { useScheduleStore, Member } from './useScheduleStore';

interface CalendarGridProps {
  onSlotClick: (date: Date, hour: number, minute: number) => void;
  onQuickAddSlot?: (dayOfWeek: number, startTime: string, endTime: string) => void;
  quickAddMode?: boolean;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);
const MINUTES = [0, 30];
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const getHeatColor = (count: number, total: number): string => {
  if (total === 0) return '#e8f5e9';
  if (count === 0) return '#e8f5e9';
  if (count <= 2) return '#a5d6a7';
  if (count <= 4) return '#66bb6a';
  return '#d32f2f';
};

const CalendarGrid: React.FC<CalendarGridProps> = ({
  onSlotClick,
  onQuickAddSlot,
  quickAddMode = false,
}) => {
  const [hoveredSlot, setHoveredSlot] = useState<{
    date: Date;
    hour: number;
    minute: number;
    x: number;
    y: number;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [selectedMobileDay, setSelectedMobileDay] = useState(0);

  const {
    members,
    getAvailableMembersForSlot,
    getMeetingsForSlot,
    isSlotAllAvailable,
  } = useScheduleStore();

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => addDays(today, i));
  }, []);

  const displayDays = isMobile ? [days[selectedMobileDay]] : days;

  const handleSlotHover = useCallback(
    (date: Date, hour: number, minute: number, e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setHoveredSlot({
        date,
        hour,
        minute,
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    },
    []
  );

  const handleSlotLeave = useCallback(() => {
    setHoveredSlot(null);
  }, []);

  const handleSlotClick = useCallback(
    (date: Date, hour: number, minute: number) => {
      if (quickAddMode && onQuickAddSlot) {
        const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const endTime =
          minute === 30
            ? `${String(hour + 1).padStart(2, '0')}:00`
            : `${String(hour).padStart(2, '0')}:30`;
        onQuickAddSlot(date.getDay(), startTime, endTime);
      } else if (isSlotAllAvailable(date, hour, minute)) {
        onSlotClick(date, hour, minute);
      }
    },
    [quickAddMode, onQuickAddSlot, onSlotClick, isSlotAllAvailable]
  );

  const getSlotInfo = useCallback(
    (date: Date, hour: number, minute: number) => {
      const availableMembers = getAvailableMembersForSlot(date, hour, minute);
      const meetings = getMeetingsForSlot(date, hour, minute);
      const allAvailable = isSlotAllAvailable(date, hour, minute);
      return { availableMembers, meetings, allAvailable };
    },
    [getAvailableMembersForSlot, getMeetingsForSlot, isSlotAllAvailable]
  );

  const getMeetingDisplay = useCallback(
    (meetings: ReturnType<typeof getMeetingsForSlot>, date: Date, hour: number, minute: number) => {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);

      return meetings
        .filter((m) => isSameMinute(parseISO(m.startTime), slotStart))
        .map((m) => ({
          id: m.id,
          title: m.title,
          spans: Math.ceil(m.duration / 30),
        }));
    },
    [getMeetingsForSlot]
  );

  const hoveredMembers: Member[] = hoveredSlot
    ? getAvailableMembersForSlot(hoveredSlot.date, hoveredSlot.hour, hoveredSlot.minute)
    : [];

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {isMobile && (
        <div style={styles.mobileDaySelector}>
          {days.map((day, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedMobileDay(idx)}
              style={{
                ...styles.mobileDayButton,
                ...(selectedMobileDay === idx ? styles.mobileDayButtonActive : {}),
              }}
            >
              {format(day, 'MM/dd')}
              <br />
              <span style={{ fontSize: 11 }}>{WEEKDAYS[day.getDay()]}</span>
            </button>
          ))}
        </div>
      )}

      <div style={styles.gridContainer}>
        <div style={styles.timeHeader}>
          <div style={styles.cornerCell}></div>
          {displayDays.map((day, idx) => (
            <div key={idx} style={styles.dayHeader}>
              <div style={styles.dayHeaderWeekday}>{WEEKDAYS[day.getDay()]}</div>
              <div style={styles.dayHeaderDate}>{format(day, 'MM月dd日')}</div>
            </div>
          ))}
        </div>

        <div style={styles.gridBody}>
          {HOURS.map((hour) =>
            MINUTES.map((minute) => {
              const timeLabel =
                minute === 0 ? `${String(hour).padStart(2, '0')}:00` : '';
              return (
                <div
                  key={`${hour}-${minute}`}
                  style={{
                    display: 'contents',
                  }}
                >
                  <div style={styles.timeLabel}>{timeLabel}</div>
                  {displayDays.map((day, dayIdx) => {
                    const { availableMembers, meetings, allAvailable } = getSlotInfo(
                      day,
                      hour,
                      minute
                    );
                    const bgColor = quickAddMode
                      ? '#fff3e0'
                      : getHeatColor(availableMembers.length, members.length);
                    const meetingDisplays = getMeetingDisplay(meetings, day, hour, minute);
                    const hasMeeting = meetings.length > 0;
                    const isClickable = quickAddMode || allAvailable;

                    return (
                      <div
                        key={`${dayIdx}-${hour}-${minute}`}
                        onMouseEnter={(e) => handleSlotHover(day, hour, minute, e)}
                        onMouseLeave={handleSlotLeave}
                        onClick={() => handleSlotClick(day, hour, minute)}
                        style={{
                          ...styles.slot,
                          backgroundColor: hasMeeting ? '#1976d2' : bgColor,
                          cursor: isClickable ? 'pointer' : 'default',
                          transition: 'all 0.5s ease-in-out',
                        }}
                      >
                        {meetingDisplays.map((m) => (
                          <div
                            key={m.id}
                            style={{
                              ...styles.meetingBlock,
                              height: `${m.spans * 100}%`,
                            }}
                          >
                            {m.title}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      {hoveredSlot && (
        <div
          style={{
            ...styles.tooltip,
            left: hoveredSlot.x,
            top: hoveredSlot.y - 8,
          }}
        >
          <div style={styles.tooltipTime}>
            {format(hoveredSlot.date, 'MM月dd日')}{' '}
            {`${String(hoveredSlot.hour).padStart(2, '0')}:${String(
              hoveredSlot.minute
            ).padStart(2, '0')} - ${
              hoveredSlot.minute === 30
                ? `${String(hoveredSlot.hour + 1).padStart(2, '0')}:00`
                : `${String(hoveredSlot.hour).padStart(2, '0')}:30`
            }`}
          </div>
          <div style={styles.tooltipCount}>
            空闲人数：{hoveredMembers.length} / {members.length}
          </div>
          {hoveredMembers.length > 0 && (
            <div style={styles.tooltipMembers}>
              {hoveredMembers.map((m) => (
                <span key={m.id} style={styles.tooltipMemberTag}>
                  {m.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        [data-slot]:hover {
          transform: scale(1.1);
          z-index: 10;
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  gridContainer: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  mobileDaySelector: {
    display: 'flex',
    gap: 4,
    overflowX: 'auto',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 12,
  },
  mobileDayButton: {
    flex: '0 0 auto',
    padding: '8px 12px',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    fontSize: 12,
    textAlign: 'center',
    transition: 'all 0.3s ease-in-out',
  },
  mobileDayButtonActive: {
    backgroundColor: '#1976d2',
    color: '#ffffff',
  },
  timeHeader: {
    display: 'grid',
    gridTemplateColumns: '60px repeat(var(--days, 7), 1fr)',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#fafafa',
  },
  cornerCell: {
    padding: 12,
    borderRight: '1px solid #e0e0e0',
  },
  dayHeader: {
    padding: '12px 8px',
    textAlign: 'center',
    borderRight: '1px solid #f0f0f0',
  },
  dayHeaderWeekday: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dayHeaderDate: {
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
  },
  gridBody: {
    display: 'grid',
    gridTemplateColumns: '60px repeat(var(--days, 7), 1fr)',
    maxHeight: '60vh',
    overflowY: 'auto',
  },
  timeLabel: {
    padding: '4px 8px',
    fontSize: 11,
    color: '#999',
    textAlign: 'right',
    borderRight: '1px solid #e0e0e0',
    borderBottom: '1px solid #f5f5f5',
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  slot: {
    height: 32,
    borderRight: '1px solid #f5f5f5',
    borderBottom: '1px solid #f5f5f5',
    position: 'relative',
    transformOrigin: 'center',
    transition: 'transform 0.3s ease-in-out',
  },
  meetingBlock: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    backgroundColor: '#1976d2',
    color: '#fff',
    fontSize: 10,
    padding: '2px 4px',
    borderRadius: 4,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    zIndex: 1,
  },
  tooltip: {
    position: 'fixed',
    transform: 'translate(-50%, -100%)',
    backgroundColor: 'rgba(0,0,0,0.85)',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 12,
    zIndex: 1000,
    pointerEvents: 'none',
    minWidth: 180,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  tooltipTime: {
    fontWeight: 600,
    marginBottom: 6,
    fontSize: 13,
  },
  tooltipCount: {
    marginBottom: 8,
    color: '#a5d6a7',
  },
  tooltipMembers: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  tooltipMemberTag: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: '2px 8px',
    borderRadius: 10,
    fontSize: 11,
  },
};

export default CalendarGrid;
