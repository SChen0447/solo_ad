import { useState, useRef, useEffect, useCallback } from 'react';
import type { Bookmark, TimeRange } from '../types/bookmark';
import { formatTimestamp } from '../utils/bookmarkParser';
import './TimelinePanel.css';

interface TimelinePanelProps {
  bookmarks: Bookmark[];
  onTimeRangeChange: (range: TimeRange) => void;
  selectedTag: string | null;
}

const PADDING_LEFT = 50;
const PADDING_RIGHT = 50;
const MIN_BREAKPOINTS = 10;

export function TimelinePanel({ bookmarks, onTimeRangeChange, selectedTag }: TimelinePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const translateXRef = useRef(0);
  const [translateX, setTranslateX] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [hoveredBookmark, setHoveredBookmark] = useState<Bookmark | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const lastTimeRangeRef = useRef<TimeRange | null>(null);
  const onTimeRangeChangeRef = useRef(onTimeRangeChange);

  useEffect(() => {
    onTimeRangeChangeRef.current = onTimeRangeChange;
  }, [onTimeRangeChange]);

  const sortedBookmarks = [...bookmarks].sort((a, b) => a.timestamp - b.timestamp);

  const minTime = sortedBookmarks.length > 0
    ? sortedBookmarks[0].timestamp - 86400000
    : Date.now() - 86400000 * 30;
  const maxTime = sortedBookmarks.length > 0
    ? sortedBookmarks[sortedBookmarks.length - 1].timestamp + 86400000
    : Date.now();
  const timeSpan = maxTime - minTime || 86400000;

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setContainerWidth(width);
        const calculatedContentWidth = Math.max(width, sortedBookmarks.length * 40 + PADDING_LEFT + PADDING_RIGHT);
        setContentWidth(calculatedContentWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [sortedBookmarks.length]);

  useEffect(() => {
    const calculatedContentWidth = Math.max(
      containerWidth,
      sortedBookmarks.length * 40 + PADDING_LEFT + PADDING_RIGHT
    );
    setContentWidth(calculatedContentWidth);
  }, [sortedBookmarks.length, containerWidth]);

  const pixelsPerMs = (contentWidth - PADDING_LEFT - PADDING_RIGHT) / timeSpan;

  const getXPosition = useCallback((timestamp: number) => {
    return PADDING_LEFT + (timestamp - minTime) * pixelsPerMs;
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

  const updateVisibleTimeRange = useCallback((currentTranslate: number) => {
    if (containerWidth === 0 || contentWidth === 0) return;

    const visibleStartX = -currentTranslate;
    const visibleEndX = -currentTranslate + containerWidth;

    const startTime = minTime + (visibleStartX - PADDING_LEFT) / pixelsPerMs;
    const endTime = minTime + (visibleEndX - PADDING_LEFT) / pixelsPerMs;

    const newRange: TimeRange = {
      start: Math.max(startTime, minTime),
      end: Math.min(endTime, maxTime),
    };

    const last = lastTimeRangeRef.current;
    if (last && Math.abs(last.start - newRange.start) < 1000 && Math.abs(last.end - newRange.end) < 1000) {
      return;
    }

    lastTimeRangeRef.current = newRange;
    onTimeRangeChangeRef.current(newRange);
  }, [containerWidth, contentWidth, minTime, maxTime, pixelsPerMs]);

  useEffect(() => {
    updateVisibleTimeRange(translateX);
  }, [translateX, updateVisibleTimeRange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStartX(e.clientX - translateXRef.current);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      let newTranslateX = e.clientX - dragStartX;

      const maxTranslate = 0;
      const minTranslate = -(contentWidth - containerWidth);

      newTranslateX = Math.max(minTranslate, Math.min(maxTranslate, newTranslateX));

      translateXRef.current = newTranslateX;
      setTranslateX(newTranslateX);
      rafRef.current = null;
    });
  }, [isDragging, dragStartX, contentWidth, containerWidth]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mouseleave', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleNodeMouseEnter = (e: React.MouseEvent, bookmark: Bookmark) => {
    setHoveredBookmark(bookmark);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (containerRect) {
      setTooltipPos({
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top - 8,
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

  const axisY = 50;

  return (
    <div
      className="timeline-container"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <svg
        className={`timeline-svg ${isDragging ? 'dragging' : ''}`}
        width={contentWidth}
        height="100"
        style={{ transform: `translateX(${translateX}px)` }}
      >
        <line
          x1={PADDING_LEFT}
          y1={axisY}
          x2={contentWidth - PADDING_RIGHT}
          y2={axisY}
          stroke="#555"
          strokeWidth="2"
        />

        {sortedBookmarks.length > 1 && sortedBookmarks.map((bookmark, index) => {
          if (index === sortedBookmarks.length - 1) return null;
          const nextBookmark = sortedBookmarks[index + 1];
          const x1 = getXPosition(bookmark.timestamp);
          const x2 = getXPosition(nextBookmark.timestamp);
          const visible = isBookmarkVisible(bookmark) && isBookmarkVisible(nextBookmark);
          return (
            <line
              key={`line-${bookmark.id}`}
              x1={x1}
              y1={axisY}
              x2={x2}
              y2={axisY}
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
            <circle
              key={bookmark.id}
              cx={x}
              cy={axisY}
              r={3}
              fill={visible ? color : '#555'}
              className={`timeline-node ${visible ? '' : 'dimmed'}`}
              onMouseEnter={(e) => handleNodeMouseEnter(e, bookmark)}
              onMouseLeave={handleNodeMouseLeave}
            />
          );
        })}

        {MIN_BREAKPOINTS > 0 && Array.from({ length: MIN_BREAKPOINTS + 1 }).map((_, i) => {
          const ratio = i / MIN_BREAKPOINTS;
          const timestamp = minTime + timeSpan * ratio;
          const x = PADDING_LEFT + (contentWidth - PADDING_LEFT - PADDING_RIGHT) * ratio;
          const date = new Date(timestamp);
          const label = `${date.getMonth() + 1}/${date.getDate()}`;
          return (
            <g key={`tick-${i}`}>
              <line
                x1={x}
                y1={axisY - 4}
                x2={x}
                y2={axisY + 4}
                stroke="#666"
                strokeWidth="1"
              />
              <text
                x={x}
                y={axisY + 18}
                textAnchor="middle"
                fill="#888"
                fontSize="10"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>

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
  );
}
