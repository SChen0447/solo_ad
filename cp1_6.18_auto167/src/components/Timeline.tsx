import { useEffect, useRef, useState, useCallback } from 'react';
import { useTimelineStore } from '@/core/store';
import { formatDate, addDays, getMoodColor, getMoodLabel } from '@/core/stats';

const BEAD_SIZE = 20;
const BEAD_HOVER_SIZE = 28;
const BEAD_GAP = 40;

interface BeadProps {
  date: string;
  isToday: boolean;
  isSelected: boolean;
  onClick: () => void;
}

function Bead({ date, isToday, isSelected, onClick }: BeadProps) {
  const [hover, setHover] = useState(false);
  const node = useTimelineStore((s) => s.getDateNode(date));
  const color = getMoodColor(node.mood);
  const label = getMoodLabel(node.mood);
  const size = hover || isSelected ? BEAD_HOVER_SIZE : BEAD_SIZE;

  return (
    <div
      className="bead-wrapper"
      style={{
        width: BEAD_GAP,
        height: BEAD_GAP,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div
        className="bead"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5), ${color} 60%, ${color})`,
          boxShadow: isSelected
            ? `0 0 20px ${color}, 0 0 40px ${color}66`
            : hover
            ? `0 0 12px ${color}aa`
            : `0 0 6px ${color}55`,
          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          className="bead-shine"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)',
            animation: 'shine 0.5s linear infinite',
          }}
        />
      </div>
      {isToday && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            fontSize: 10,
            color: '#e0e6ed',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          今天
        </div>
      )}
      {hover && (
        <div
          className="tooltip glass"
          style={{
            position: 'absolute',
            bottom: BEAD_GAP + 8,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 14px',
            borderRadius: 10,
            backdropFilter: 'blur(16px)',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 50,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e0e6ed', marginBottom: 4 }}>{date}</div>
          <div style={{ fontSize: 12, color, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            {label}{node.mood ? ` (${node.mood}/10)` : ''}
          </div>
          {node.entryCount > 0 && (
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              {node.entryCount} 条记录
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Timeline() {
  const selectDate = useTimelineStore((s) => s.selectDate);
  const selectedDate = useTimelineStore((s) => s.selectedDate);
  const layoutMode = useTimelineStore((s) => s.layoutMode);
  const visibleNodeCount = useTimelineStore((s) => s.visibleNodeCount);
  const jumpToTodayRef = useTimelineStore((s) => s as unknown as { jumpToToday?: () => void });

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [centerOffset, setCenterOffset] = useState(0);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, offset: 0 });

  const today = formatDate(new Date());
  const half = Math.floor(visibleNodeCount / 2);
  const startDate = addDays(today, -half + centerOffset);
  const dates: string[] = [];
  for (let i = 0; i < visibleNodeCount; i++) {
    dates.push(addDays(startDate, i));
  }

  const scrollToToday = useCallback(() => {
    setCenterOffset(0);
  }, []);

  useEffect(() => {
    (jumpToTodayRef as unknown as { jumpToToday: () => void }).jumpToToday = scrollToToday;
  }, [jumpToTodayRef, scrollToToday]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = layoutMode === 'horizontal' ? e.deltaX || e.deltaY : e.deltaY;
    const step = delta > 0 ? 1 : -1;
    setCenterOffset((prev) => prev + step);
  }, [layoutMode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, offset: centerOffset };
    (e.target as HTMLElement).style.cursor = 'grabbing';
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const steps = Math.round(dx / BEAD_GAP);
    setCenterOffset(dragStart.current.offset - steps);
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    if (containerRef.current) {
      containerRef.current.style.cursor = '';
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const isVertical = layoutMode === 'vertical';

  return (
    <div
      ref={containerRef}
      className="timeline-container"
      style={{
        width: '100%',
        height: isVertical ? 'calc(100vh - 80px)' : 140,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'grab',
        userSelect: 'none',
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: isVertical ? 'column' : 'row',
        }}
      >
        <div
          style={{
            position: 'absolute',
            [isVertical ? 'width' : 'height']: 2,
            [isVertical ? 'height' : 'width']: '100%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(148,163,184,0.3) 15%, rgba(148,163,184,0.3) 85%, transparent 100%)',
            [isVertical ? 'top' : 'left']: 0,
            [isVertical ? 'left' : 'top']: '50%',
            transform: isVertical ? 'translateX(-50%)' : 'translateY(-50%)',
            borderRadius: 1,
          }}
        />
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            flexDirection: isVertical ? 'column' : 'row',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {dates.map((d) => (
            <Bead
              key={d}
              date={d}
              isToday={d === today}
              isSelected={d === selectedDate}
              onClick={() => selectDate(d === selectedDate ? null : d)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
