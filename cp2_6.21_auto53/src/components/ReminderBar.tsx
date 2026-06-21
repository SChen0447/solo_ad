import React, { useRef, useState, useEffect } from 'react';
import { Reminder } from '@/types';

interface ReminderBarProps {
  reminders: Reminder[];
  onReminderClick: (plantId: string) => void;
}

export const ReminderBar: React.FC<ReminderBarProps> = ({ reminders, onReminderClick }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const velocity = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const animationRef = useRef<number | null>(null);

  const containerStyle: React.CSSProperties = {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  };

  const scrollStyle: React.CSSProperties = {
    display: 'flex',
    gap: 12,
    padding: '8px 4px',
    overflowX: 'auto' as const,
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
  };

  const getItemStyle = (): React.CSSProperties => ({
    flex: '0 0 auto',
    width: 120,
    height: 50,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    padding: '0 10px',
    gap: 8,
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    position: 'relative',
  });

  const iconCircleStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: '#DCFCE7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  const textContainerStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  };

  const overdueExclamationStyle: React.CSSProperties = {
    width: 16,
    height: 16,
    borderRadius: '50%',
    backgroundColor: '#DC2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold' as const,
    lineHeight: 1,
  };

  const nameStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: '#1F2937',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const countdownStyle = (days: number): React.CSSProperties => ({
    fontSize: 11,
    color: days < 0 ? '#DC2626' : days === 0 ? '#F59E0B' : '#16A34A',
    fontWeight: 500,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startX.current = e.pageX - (scrollRef.current?.offsetLeft || 0);
    scrollLeft.current = scrollRef.current?.scrollLeft || 0;
    velocity.current = 0;
    lastX.current = e.pageX;
    lastTime.current = Date.now();
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current.offsetLeft || 0);
    const walk = (x - startX.current) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;

    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      velocity.current = (e.pageX - lastX.current) / dt;
    }
    lastX.current = e.pageX;
    lastTime.current = now;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (Math.abs(velocity.current) > 0.1) {
      startInertiaScroll();
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      if (Math.abs(velocity.current) > 0.1) {
        startInertiaScroll();
      }
    }
  };

  const startInertiaScroll = () => {
    if (!scrollRef.current) return;
    const deceleration = 0.95;
    const minVelocity = 0.01;
    let currentVelocity = velocity.current * 10;

    const animate = () => {
      if (!scrollRef.current || Math.abs(currentVelocity) < minVelocity) return;
      scrollRef.current.scrollLeft -= currentVelocity;
      currentVelocity *= deceleration;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const formatCountdown = (days: number) => {
    if (days < 0) {
      return `逾期${Math.abs(days)}天`;
    }
    if (days === 0) {
      return '今天';
    }
    if (days === 1) {
      return '明天';
    }
    return `${days}天后`;
  };

  const WaterDropIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#22C55E">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );

  const handleItemClick = (e: React.MouseEvent, plantId: string) => {
    if (Math.abs(velocity.current) > 0.5) {
      e.preventDefault();
      return;
    }
    onReminderClick(plantId);
  };

  return (
    <div style={containerStyle}>
      <div
        ref={scrollRef}
        style={scrollStyle}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="reminder-scroll"
      >
        {reminders.map((reminder) => (
          <div
            key={`${reminder.plantId}-${reminder.type}`}
            style={getItemStyle()}
            onClick={(e) => handleItemClick(e, reminder.plantId)}
            onMouseEnter={(e) => {
              if (!isDragging) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={iconCircleStyle}>
              <WaterDropIcon />
            </div>
            <div style={textContainerStyle}>
              <span style={nameStyle}>{reminder.plantName}</span>
              <span style={countdownStyle(reminder.daysUntil)}>
                {formatCountdown(reminder.daysUntil)}
              </span>
            </div>
            {reminder.daysUntil < 0 && (
              <div style={overdueExclamationStyle} title="已逾期">
                !
              </div>
            )}
          </div>
        ))}
      </div>
      <style>{`
        .reminder-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};
