import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ColorBarData } from '../types';
import { MOOD_COLORS } from '../types';

interface ColorBarProps {
  colorBars: ColorBarData[];
  weekOffset: number;
  onWeekChange: (offset: number) => void;
  onSegmentClick?: (startDate: string) => void;
}

function getWeekRangeText(offset: number): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setDate(monday.getDate() + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const formatDate = (date: Date) =>
    date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });

  if (offset === 0) {
    return `本周 · ${formatDate(monday)} - ${formatDate(sunday)}`;
  } else if (offset === -1) {
    return `上周 · ${formatDate(monday)} - ${formatDate(sunday)}`;
  } else if (offset === 1) {
    return `下周 · ${formatDate(monday)} - ${formatDate(sunday)}`;
  }
  return `${formatDate(monday)} - ${formatDate(sunday)}`;
}

const ColorBar: React.FC<ColorBarProps> = function ColorBar({
  colorBars,
  weekOffset,
  onWeekChange,
  onSegmentClick
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const diff = e.clientX - startX;
      setDragOffset(diff);
    },
    [isDragging, startX]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const threshold = 50;
    if (dragOffset > threshold) {
      onWeekChange(weekOffset - 1);
    } else if (dragOffset < -threshold) {
      onWeekChange(weekOffset + 1);
    }
    setDragOffset(0);
  }, [isDragging, dragOffset, weekOffset, onWeekChange]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;
      const diff = e.touches[0].clientX - startX;
      setDragOffset(diff);
    },
    [isDragging, startX]
  );

  const handleTouchEnd = useCallback(() => {
    handleMouseUp();
  }, [handleMouseUp]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handlePrevWeek = () => onWeekChange(weekOffset - 1);
  const handleNextWeek = () => onWeekChange(weekOffset + 1);

  return (
    <div className="color-bar-section">
      <div className="week-navigator">
        <div className="week-title">{getWeekRangeText(weekOffset)}</div>
        <div className="week-buttons">
          <button className="week-btn" onClick={handlePrevWeek}>
            <ChevronLeft size={20} />
          </button>
          <button className="week-btn" onClick={handleNextWeek}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="color-bar-container"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {colorBars.length === 0 ? (
          <div className="color-bar-placeholder">本周还没有记录，快来添加第一条便签吧~</div>
        ) : (
          <div
            className="color-bar-track"
            style={{
              transform: isDragging ? `translateX(${dragOffset}px)` : 'translateX(0)',
              transition: isDragging ? 'none' : 'transform 300ms ease'
            }}
          >
            {colorBars.map((bar, index) => {
              const moodColor = MOOD_COLORS[bar.mood] || MOOD_COLORS['soft-pink'];
              return (
                <div
                  key={index}
                  className="color-segment"
                  style={{
                    width: `${bar.percentage}%`,
                    backgroundColor: moodColor.hex,
                    borderRadius:
                      index === 0
                        ? '12px 0 0 12px'
                        : index === colorBars.length - 1
                        ? '0 12px 12px 0'
                        : '0'
                  }}
                  onClick={(e) => {
                    if (!isDragging && onSegmentClick) {
                      onSegmentClick(bar.startDate);
                    }
                    e.stopPropagation();
                  }}
                  title={`${moodColor.name} · ${bar.days}天 · ${bar.count}条`}
                >
                  <div className="color-segment-info">
                    <div className="days">{bar.days}天</div>
                    <div>{bar.count}条</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorBar;
