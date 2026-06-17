import { useState, useRef, useEffect, useCallback } from 'react';
import type { Bookmark, TimeRange } from '../types/bookmark';
import { formatTimestamp } from '../utils/bookmarkParser';
import './TimelinePanel.css';

interface TimelinePanelProps {
  bookmarks: Bookmark[];
  onTimeRangeChange: (range: TimeRange) => void;
  selectedTag: string | null;
}

export function TimelinePanel({ bookmarks, onTimeRangeChange, selectedTag }: TimelinePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hoveredBookmark, setHoveredBookmark] = useState<Bookmark | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const minTime = bookmarks.length > 0 ? Math.min(...bookmarks.map(b => b.timestamp)) : Date.now() - 86400000 * 30;
  const maxTime = bookmarks.length > 0 ? Math.max(...bookmarks.map(b => b.timestamp)) : Date.now();
  const timeSpan = maxTime - minTime || 86400000;

  const visibleWidth = containerRef.current?.clientWidth || 1200;
  const totalWidth = Math.max(visibleWidth, visibleWidth + bookmarks.length * 30);
  const pixelsPerMs = (totalWidth - 100) / timeSpan;

  const getXPosition = useCallback((timestamp: number) => {
    return 50 + (timestamp - minTime) * pixelsPerMs;
  }, [minTime, pixelsPerMs]);

  const getNodeColor = useCallback((timestamp: number) => {
    const ratio = timeSpan > 0 ? (timestamp - minTime) / timeSpan : 0;
    const startColor = { r: 108, g: 99, b: 255 };
    const endColor = { r: 224, g: 64, b: 251 };
    const r = Math.round(startColor.r + (endColor.r - startColor.r) * ratio);
    const g = Math.round(startColor.g + (endColor.g - startColor.g) * ratio);
    const b = Math.round(startColor.b + (endColor.b - startColor.b) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  }, [minTime, timeSpan]);

  const updateVisibleTimeRange = useCallback(() => {
    if (!containerRef.current) return;
    const visibleStart = scrollLeft;
    const visibleEnd = scrollLeft + visibleWidth;
    const startTime = minTime + (visibleStart - 50) / pixelsPerMs;
    const endTime = minTime + (visibleEnd - 50) / pixelsPerMs;
    onTimeRangeChange({
      start: Math.max(startTime, minTime),
      end: Math.min(endTime, maxTime),
    });
  }, [scrollLeft, visibleWidth, minTime, maxTime, pixelsPerMs, onTimeRangeChange]);

  useEffect(() => {
    updateVisibleTimeRange();
  }, [updateVisibleTimeRange]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = scrollLeft;
    }
  }, [scrollLeft]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX - scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newScrollLeft = dragStartX - e.clientX;
    const maxScroll = totalWidth - visibleWidth;
    setScrollLeft(Math.max(0, Math.min(newScrollLeft, maxScroll)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoveredBookmark(null);
  };

  const handleNodeMouseEnter = (e: React.MouseEvent, bookmark: Bookmark) => {
    setHoveredBookmark(bookmark);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (containerRect) {
      setTooltipPos({
        x: rect.left - containerRect.left + scrollLeft + 3,
        y: rect.top - containerRect.top - 10,
      });
    }
  };

  const handleNodeMouseLeave = () => {
    setHoveredBookmark(null);
  };

  const isBookmarkVisible = (bookmark: Bookmark) => {
    if (!selectedTag) return true;
    return bookmark.tags.includes(selectedTag);
  };

  const sortedBookmarks = [...bookmarks].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="timeline-container" ref={containerRef}>
      <div
        className={`timeline-scroll ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ width: totalWidth, cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="timeline-axis" />

        {sortedBookmarks.length > 1 && sortedBookmarks.slice(0, -1).map((bookmark, index) => {
          const nextBookmark = sortedBookmarks[index + 1];
          const x1 = getXPosition(bookmark.timestamp);
          const x2 = getXPosition(nextBookmark.timestamp);
          const visible = isBookmarkVisible(bookmark) && isBookmarkVisible(nextBookmark);
          return (
            <line
              key={`line-${bookmark.id}-${nextBookmark.id}`}
              x1={x1}
              y1="50"
              x2={x2}
              y2="50"
              stroke={visible ? '#555' : 'transparent'}
              strokeWidth="2"
            />
          );
        })}

        {sortedBookmarks.map((bookmark) => {
          const x = getXPosition(bookmark.timestamp);
          const color = getNodeColor(bookmark.timestamp);
          const visible = isBookmarkVisible(bookmark);
          return (
            <div
              key={bookmark.id}
              className={`timeline-node ${visible ? '' : 'dimmed'}`}
              style={{
                left: x,
                top: '50%',
                backgroundColor: visible ? color : '#555',
              }}
              onMouseEnter={(e) => handleNodeMouseEnter(e, bookmark)}
              onMouseLeave={handleNodeMouseLeave}
            />
          );
        })}

        {hoveredBookmark && (
          <div
            className="timeline-tooltip"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y,
            }}
          >
            <div className="tooltip-title">{hoveredBookmark.title}</div>
            <div className="tooltip-time">{formatTimestamp(hoveredBookmark.timestamp)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
