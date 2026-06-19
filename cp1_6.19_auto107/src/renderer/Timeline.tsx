import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { HistoricalEvent } from '../dataManager/types';
import { fetchEventsByPeriodWithBuffer } from '../dataManager/dataFetcher';
import { getEventById } from '../dataManager/mockData';
import '../styles/Timeline.css';

interface TimelineProps {
  zoom: number;
  searchFilter: string;
  onEventClick: (event: HistoricalEvent) => void;
  onZoomChange: (zoom: number) => void;
  focusEventId: string | null;
  onFocused: () => void;
}

const MIN_YEAR = -500;
const MAX_YEAR = 2100;
const TOTAL_YEARS = MAX_YEAR - MIN_YEAR;

const getGranularity = (zoom: number): { step: number; label: (year: number) => string } => {
  if (zoom < 0.02) return { step: 100, label: (y) => `${y > 0 ? '' : '公元前'}${Math.abs(Math.floor(y / 100) * 100)}年` };
  if (zoom < 0.1) return { step: 50, label: (y) => `${y > 0 ? '' : '公元前'}${Math.abs(Math.floor(y / 50) * 50)}年` };
  if (zoom < 0.3) return { step: 10, label: (y) => `${y > 0 ? '' : '公元前'}${Math.abs(Math.floor(y / 10) * 10)}年` };
  if (zoom < 0.8) return { step: 5, label: (y) => `${y > 0 ? '' : '公元前'}${Math.abs(y)}年` };
  return { step: 1, label: (y) => `${y > 0 ? '' : '公元前'}${Math.abs(y)}年` };
};

const Timeline: React.FC<TimelineProps> = ({
  zoom,
  searchFilter,
  onEventClick,
  onZoomChange,
  focusEventId,
  onFocused,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<HistoricalEvent[]>([]);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rippleEvent, setRippleEvent] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const searchLower = useMemo(() => searchFilter.toLowerCase(), [searchFilter]);

  const matchedEventIds = useMemo(() => {
    if (!searchFilter) return null;
    return events
      .filter(e => e.title.toLowerCase().includes(searchLower) ||
                   e.description.toLowerCase().includes(searchLower))
      .map(e => e.id);
  }, [events, searchLower, searchFilter]);

  const { step, label: labelFn } = useMemo(() => getGranularity(zoom), [zoom]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const visibleRange = TOTAL_YEARS / zoom;
    const centerYear = MIN_YEAR + TOTAL_YEARS / 2 - (offsetX / (window.innerWidth * 3)) * TOTAL_YEARS;
    const fetched = await fetchEventsByPeriodWithBuffer(Math.round(centerYear), Math.round(visibleRange / 2));
    setEvents(fetched);
    setLoading(false);
  }, [zoom, offsetX]);

  useEffect(() => {
    loadEvents();
  }, [zoom]);

  useEffect(() => {
    if (!focusEventId) return;

    const targetEvent = getEventById(focusEventId);
    if (!targetEvent) {
      onFocused();
      return;
    }

    const yearRatio = (targetEvent.year - MIN_YEAR) / TOTAL_YEARS;
    const targetOffset = yearRatio * window.innerWidth * 3 * zoom - window.innerWidth / 2;

    setOffsetX(Math.max(0, targetOffset));
    onZoomChange(Math.max(zoom, 0.3));
    onFocused();
  }, [focusEventId]);

  useEffect(() => {
    if (matchedEventIds && matchedEventIds.length > 0) {
      const firstMatch = events.find(e => e.id === matchedEventIds[0]);
      if (firstMatch) {
        const yearRatio = (firstMatch.year - MIN_YEAR) / TOTAL_YEARS;
        const targetOffset = yearRatio * window.innerWidth * 3 * zoom - window.innerWidth / 2;
        setOffsetX(Math.max(0, targetOffset));
      }
    }
  }, [matchedEventIds]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartOffset(offsetX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const delta = e.clientX - dragStartX;
    const maxOffset = window.innerWidth * 3 * zoom - window.innerWidth;
    setOffsetX(Math.max(0, Math.min(maxOffset, dragStartOffset - delta)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleUp);
    return () => window.removeEventListener('mouseup', handleUp);
  }, [isDragging]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const newZoom = Math.max(0.01, Math.min(2, zoom + delta));
    onZoomChange(newZoom);
  }, [zoom, onZoomChange]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStartX(e.touches[0].clientX);
      setDragStartOffset(offsetX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const delta = e.touches[0].clientX - dragStartX;
    const maxOffset = window.innerWidth * 3 * zoom - window.innerWidth;
    setOffsetX(Math.max(0, Math.min(maxOffset, dragStartOffset - delta)));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleEventClick = (event: HistoricalEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setRippleEvent(event.id);
    setTimeout(() => setRippleEvent(null), 600);
    onEventClick(event);
  };

  const ticks = useMemo(() => {
    const result: { year: number; x: number; label: string; major: boolean }[] = [];
    const startYear = MIN_YEAR + Math.floor((offsetX / (window.innerWidth * 3 * zoom)) * TOTAL_YEARS / step) * step;
    for (let year = startYear; year <= MAX_YEAR; year += step) {
      const yearRatio = (year - MIN_YEAR) / TOTAL_YEARS;
      const x = yearRatio * window.innerWidth * 3 * zoom;
      const visibleX = x - offsetX;
      if (visibleX > -100 && visibleX < window.innerWidth + 100) {
        result.push({
          year,
          x,
          label: labelFn(year),
          major: year % (step * 5) === 0,
        });
      }
    }
    return result;
  }, [offsetX, zoom, step, labelFn]);

  const visibleEvents = useMemo(() => {
    return events.filter(event => {
      const yearRatio = (event.year - MIN_YEAR) / TOTAL_YEARS;
      const x = yearRatio * window.innerWidth * 3 * zoom;
      const visibleX = x - offsetX;
      return visibleX > -50 && visibleX < window.innerWidth + 50;
    });
  }, [events, offsetX, zoom]);

  const cursorYear = useMemo(() => {
    const centerRatio = (offsetX + window.innerWidth / 2) / (window.innerWidth * 3 * zoom);
    return Math.round(MIN_YEAR + centerRatio * TOTAL_YEARS);
  }, [offsetX, zoom]);

  return (
    <div
      ref={containerRef}
      className={`timeline-container ${isMobile ? 'mobile' : ''} ${isDragging ? 'dragging' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="zoom-indicator">缩放: {(zoom * 100).toFixed(0)}%</div>
      <div className="cursor-year">当前: {cursorYear > 0 ? `公元${cursorYear}年` : `公元前${Math.abs(cursorYear)}年`}</div>

      {loading && <div className="loading-indicator">加载中...</div>}

      <div
        ref={timelineRef}
        className="timeline-viewport"
      >
        <div
          className="timeline-track"
          style={{
            width: `${window.innerWidth * 3 * zoom}px`,
            transform: `translateX(${-offsetX}px)`,
          }}
        >
          <svg
            className="timeline-svg"
            width={window.innerWidth * 3 * zoom}
            height="100%"
          >
            <line
              x1="0"
              y1="50%"
              x2="100%"
              y2="50%"
              className="timeline-line"
            />
            {ticks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={tick.x}
                  y1="50%"
                  x2={tick.x}
                  y2={tick.major ? 'calc(50% - 24px)' : 'calc(50% - 14px)'}
                  className={`tick-line ${tick.major ? 'major' : ''}`}
                />
                {tick.major && (
                  <text
                    x={tick.x}
                    y="calc(50% - 32px)"
                    className="tick-label"
                    textAnchor="middle"
                  >
                    {tick.label}
                  </text>
                )}
              </g>
            ))}
          </svg>

          <div className="events-layer">
            {visibleEvents.map((event) => {
              const yearRatio = (event.year - MIN_YEAR) / TOTAL_YEARS;
              const x = yearRatio * window.innerWidth * 3 * zoom;
              const isMatched = matchedEventIds ? matchedEventIds.includes(event.id) : false;
              const isFiltered = searchFilter && !isMatched;
              const isRippling = rippleEvent === event.id;

              return (
                <div
                  key={event.id}
                  className={`event-node-wrapper ${isMatched ? 'matched' : ''} ${isFiltered ? 'filtered' : ''}`}
                  style={{
                    left: x,
                    transition: 'transform 300ms ease',
                  }}
                >
                  <div
                    className={`event-node ${isRippling ? 'rippling' : ''}`}
                    onClick={(e) => handleEventClick(event, e)}
                    title={`${event.date} - ${event.title}`}
                  >
                    {isRippling && <span className="ripple" />}
                    <span className="node-dot" />
                  </div>
                  {isMatched && (
                    <div className="event-tooltip">
                      {event.title}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="cursor-indicator">
          <div className="cursor-line" />
        </div>
      </div>
    </div>
  );
};

export default Timeline;
