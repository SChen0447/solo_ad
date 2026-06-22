import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Subtitle, TIMELINE_MAX_DURATION, SUBTITLE_COLORS } from '../types';

type DragType = 'move' | 'left' | 'right' | null;

interface TimelineProps {
  subtitles: Subtitle[];
  onSubtitleUpdate: (id: string, updates: Partial<Subtitle>) => void;
  selectedSubtitleId: string | null;
  onSelectSubtitle: (id: string | null) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  subtitles,
  onSubtitleUpdate,
  selectedSubtitleId,
  onSelectSubtitle,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const [dragging, setDragging] = useState<{
    id: string;
    type: DragType;
    startX: number;
    startStartTime: number;
    startDuration: number;
  } | null>(null);

  const ROW_HEIGHT = 40;
  const TICK_HEIGHT = 24;
  const PADDING_LEFT = 60;

  useEffect(() => {
    const updateWidth = () => {
      if (timelineRef.current) {
        setTimelineWidth(timelineRef.current.clientWidth - PADDING_LEFT);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const getBarColor = (index: number): string => {
    return SUBTITLE_COLORS[index % SUBTITLE_COLORS.length];
  };

  const timeToPixel = (time: number): number => {
    return (time / TIMELINE_MAX_DURATION) * timelineWidth;
  };

  const pixelToTime = (pixel: number): number => {
    const ratio = pixel / timelineWidth;
    return Math.max(0, Math.min(TIMELINE_MAX_DURATION, ratio * TIMELINE_MAX_DURATION));
  };

  const handleMouseDown = useCallback((
    e: React.MouseEvent,
    subtitle: Subtitle,
    type: DragType
  ) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectSubtitle(subtitle.id);
    setDragging({
      id: subtitle.id,
      type,
      startX: e.clientX,
      startStartTime: subtitle.startTime,
      startDuration: subtitle.duration,
    });
  }, [onSelectSubtitle]);

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const relX = e.clientX - rect.left - PADDING_LEFT;
      const deltaTime = pixelToTime(relX) - pixelToTime(dragging.startX - rect.left - PADDING_LEFT);

      const subtitle = subtitles.find(s => s.id === dragging.id);
      if (!subtitle) return;

      if (dragging.type === 'move') {
        let newStartTime = Math.max(0, Math.min(
          TIMELINE_MAX_DURATION - subtitle.duration,
          dragging.startStartTime + deltaTime
        ));
        newStartTime = Math.round(newStartTime * 10) / 10;
        onSubtitleUpdate(dragging.id, { startTime: newStartTime });
      } else if (dragging.type === 'left') {
        const timeDelta = Math.max(0.1, dragging.startDuration - deltaTime);
        const newDuration = Math.round(timeDelta * 10) / 10;
        const maxDuration = TIMELINE_MAX_DURATION - dragging.startStartTime;
        const finalDuration = Math.min(newDuration, maxDuration);
        if (finalDuration >= 0.1) {
          const newStartTime = Math.max(0, Math.min(
            TIMELINE_MAX_DURATION - 0.1,
            dragging.startStartTime + (dragging.startDuration - finalDuration)
          ));
          const roundedStartTime = Math.round(newStartTime * 10) / 10;
          onSubtitleUpdate(dragging.id, {
            startTime: roundedStartTime,
            duration: finalDuration,
          });
        }
      } else if (dragging.type === 'right') {
        const newDuration = Math.max(0.1, dragging.startDuration + deltaTime);
        const maxDuration = TIMELINE_MAX_DURATION - subtitle.startTime;
        const finalDuration = Math.min(newDuration, maxDuration);
        const rounded = Math.round(finalDuration * 10) / 10;
        if (rounded >= 0.1) {
          onSubtitleUpdate(dragging.id, { duration: rounded });
        }
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, subtitles, onSubtitleUpdate]);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('timeline-content')) {
      onSelectSubtitle(null);
    }
  };

  const ticks = [];
  for (let i = 0; i <= TIMELINE_MAX_DURATION; i += 5) {
    ticks.push(i);
  }

  const minorTicks = [];
  for (let i = 0; i <= TIMELINE_MAX_DURATION; i++) {
    minorTicks.push(i);
  }

  return (
    <div className="timeline-wrapper" onClick={handleTimelineClick}>
      <style>{`
        .timeline-wrapper {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
          user-select: none;
        }

        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .timeline-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .timeline-hint {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .timeline {
          position: relative;
          overflow-x: auto;
        }

        .timeline-content {
          position: relative;
          padding-left: ${PADDING_LEFT}px;
          padding-top: ${TICK_HEIGHT}px;
        }

        .timeline-ticks {
          position: absolute;
          top: 0;
          left: ${PADDING_LEFT}px;
          right: 0;
          height: ${TICK_HEIGHT}px;
          border-bottom: 1px solid var(--border-color);
        }

        .timeline-tick {
          position: absolute;
          top: 0;
          font-size: 10px;
          color: var(--text-secondary);
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .timeline-tick::before {
          content: '';
          display: block;
          width: 1px;
          height: 8px;
          background: var(--border-color);
          margin-bottom: 2px;
        }

        .timeline-tick.minor::before {
          height: 4px;
          opacity: 0.5;
        }

        .timeline-row-labels {
          position: absolute;
          left: 0;
          top: ${TICK_HEIGHT}px;
          width: ${PADDING_LEFT - 8}px;
        }

        .timeline-row-label {
          height: ${ROW_HEIGHT}px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 8px;
          font-size: 11px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .timeline-rows {
          position: relative;
        }

        .timeline-row {
          position: relative;
          height: ${ROW_HEIGHT}px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .timeline-row-grid {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: repeating-linear-gradient(
            to right,
            transparent,
            transparent calc(100% / ${TIMELINE_MAX_DURATION / 5} - 1px),
            rgba(255, 255, 255, 0.05) calc(100% / ${TIMELINE_MAX_DURATION / 5} - 1px),
            rgba(255, 255, 255, 0.05) calc(100% / ${TIMELINE_MAX_DURATION / 5})
          );
        }

        .subtitle-bar {
          position: absolute;
          top: 6px;
          height: ${ROW_HEIGHT - 12}px;
          border-radius: 6px;
          cursor: grab;
          display: flex;
          align-items: center;
          padding: 0 10px;
          font-size: 12px;
          color: white;
          font-weight: 500;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          transition: box-shadow 0.2s ease, transform 0.1s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .subtitle-bar:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
          z-index: 10;
        }

        .subtitle-bar.selected {
          outline: 2px solid #ffffff;
          outline-offset: 1px;
          z-index: 20;
        }

        .subtitle-bar:active {
          cursor: grabbing;
        }

        .subtitle-bar-text {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          pointer-events: none;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        .subtitle-bar-resize {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 8px;
          cursor: ew-resize;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .subtitle-bar:hover .subtitle-bar-resize {
          opacity: 1;
        }

        .subtitle-bar-resize.left {
          left: 0;
          border-top-left-radius: 6px;
          border-bottom-left-radius: 6px;
        }

        .subtitle-bar-resize.right {
          right: 0;
          border-top-right-radius: 6px;
          border-bottom-right-radius: 6px;
        }

        .subtitle-bar-resize-handle {
          width: 3px;
          height: 16px;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 2px;
        }

        .timeline-empty {
          text-align: center;
          padding: 24px 12px;
          color: var(--text-secondary);
          font-size: 12px;
          font-style: italic;
        }
      `}</style>

      <div className="timeline-header">
        <span className="timeline-title">
          <span>⏱</span>
          时间轴编排
        </span>
        <span className="timeline-hint">拖拽条块调整时间，拖拽边缘调整时长</span>
      </div>

      {subtitles.length === 0 ? (
        <div className="timeline-empty">暂无字幕，请先添加字幕</div>
      ) : (
        <div className="timeline" ref={timelineRef}>
          <div className="timeline-content">
            <div className="timeline-ticks">
              {ticks.map((tick) => (
                <div
                  key={tick}
                  className="timeline-tick"
                  style={{ left: `${timeToPixel(tick)}px` }}
                >
                  {tick}s
                </div>
              ))}
              {minorTicks.filter(t => t % 5 !== 0).map((tick) => (
                <div
                  key={`minor-${tick}`}
                  className="timeline-tick minor"
                  style={{ left: `${timeToPixel(tick)}px` }}
                />
              ))}
            </div>

            <div className="timeline-row-labels">
              {subtitles.map((_, index) => (
                <div key={index} className="timeline-row-label">
                  第{index + 1}条
                </div>
              ))}
            </div>

            <div className="timeline-rows">
              {subtitles.map((subtitle, index) => {
                const left = timeToPixel(subtitle.startTime);
                const width = timeToPixel(subtitle.duration);
                const color = getBarColor(index);
                const isSelected = selectedSubtitleId === subtitle.id;

                return (
                  <div key={subtitle.id} className="timeline-row">
                    <div className="timeline-row-grid" />
                    <div
                      className={`subtitle-bar ${isSelected ? 'selected' : ''}`}
                      style={{
                        left: `${left}px`,
                        width: `${Math.max(width, 20)}px`,
                        top: `${index * ROW_HEIGHT + 6}px`,
                        background: `linear-gradient(135deg, ${color}, ${color}dd)`,
                      }}
                      onMouseDown={(e) => handleMouseDown(e, subtitle, 'move')}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSubtitle(subtitle.id);
                      }}
                    >
                      <div
                        className="subtitle-bar-resize left"
                        onMouseDown={(e) => handleMouseDown(e, subtitle, 'left')}
                      >
                        <div className="subtitle-bar-resize-handle" />
                      </div>
                      <span className="subtitle-bar-text">
                        {subtitle.text || `字幕 ${index + 1}`}
                      </span>
                      <div
                        className="subtitle-bar-resize right"
                        onMouseDown={(e) => handleMouseDown(e, subtitle, 'right')}
                      >
                        <div className="subtitle-bar-resize-handle" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
