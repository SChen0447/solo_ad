import { useRef, useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import { Chapter } from '@/api';
import './ChapterTimeline.css';

interface ChapterTimelineProps {
  chapters: Chapter[];
  selectedChapterId: string | null;
  onSelectChapter: (id: string) => void;
  onEditChapter: (chapter: Chapter) => void;
  timeRange: [number, number];
  setTimeRange: Dispatch<SetStateAction<[number, number]>>;
  minTime: number;
  maxTime: number;
}

const typeColors: Record<string, string> = {
  plot: '#3182ce',
  character: '#38a169',
  turning: '#e53e3e',
};

const typeLabels: Record<string, string> = {
  plot: '剧情推动',
  character: '角色发展',
  turning: '转折点',
};

function ChapterTimeline({
  chapters,
  selectedChapterId,
  onSelectChapter,
  onEditChapter,
  timeRange,
  setTimeRange,
  minTime,
  maxTime,
}: ChapterTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const [visibleChapters, setVisibleChapters] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisibleChapters(new Set(chapters.map((c) => c.id)));
    }, 50);
    return () => clearTimeout(timer);
  }, [chapters]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getWordCount = (content: string) => {
    return content.replace(/[#*_`~\-\n\s]/g, '').length;
  };

  const handleTimelineMouseDown = (e: React.MouseEvent, type: 'start' | 'end') => {
    e.preventDefault();
    setIsDragging(type);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));

      setTimeRange((prev) => {
        const newRange: [number, number] = [...prev] as [number, number];
        if (isDragging === 'start') {
          newRange[0] = Math.min(percentage, prev[1] - 5);
        } else {
          newRange[1] = Math.max(percentage, prev[0] + 5);
        }
        return newRange;
      });
    },
    [isDragging, setTimeRange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

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

  const progressToTime = (progress: number) => {
    return minTime + ((maxTime - minTime) * progress) / 100;
  };

  return (
    <div className="chapter-timeline">
      <div className="timeline-header">
        <h2 className="timeline-title">章节廊道</h2>
        <span className="timeline-count">
          显示 {chapters.length} 章
        </span>
      </div>

      <div className="chapters-container">
        <div className="chapters-scroll">
          {chapters.length === 0 ? (
            <div className="empty-state">
              <p>暂无章节</p>
              <span>在左侧编辑区创建你的第一章吧</span>
            </div>
          ) : (
            chapters.map((chapter, index) => (
              <div
                key={chapter.id}
                className={`chapter-card ${selectedChapterId === chapter.id ? 'selected' : ''} ${
                  visibleChapters.has(chapter.id) ? 'visible' : ''
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => onSelectChapter(chapter.id)}
                onDoubleClick={() => onEditChapter(chapter)}
              >
                <div
                  className="card-top-bar"
                  style={{ backgroundColor: typeColors[chapter.type] }}
                />
                <div className="card-content">
                  <div className="card-type-badge" style={{ color: typeColors[chapter.type] }}>
                    {typeLabels[chapter.type]}
                  </div>
                  <h3 className="card-title">{chapter.title}</h3>
                  <p className="card-preview">
                    {chapter.content.replace(/[#*_`~-]/g, '').slice(0, 60)}...
                  </p>
                  <div className="card-footer">
                    <span className="card-date">{formatDate(chapter.timestamp)}</span>
                    <span className="card-words">
                      {getWordCount(chapter.content)} 字
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="timeline-slider" ref={timelineRef}>
        <div className="slider-track">
          <div
            className="slider-active"
            style={{
              left: `${timeRange[0]}%`,
              width: `${timeRange[1] - timeRange[0]}%`,
            }}
          />
        </div>

        <div
          className="slider-handle start"
          style={{ left: `${timeRange[0]}%` }}
          onMouseDown={(e) => handleTimelineMouseDown(e, 'start')}
        >
          <div className="handle-dot" />
          <div className="handle-label">
            {formatDate(progressToTime(timeRange[0]))}
          </div>
        </div>

        <div
          className="slider-handle end"
          style={{ left: `${timeRange[1]}%` }}
          onMouseDown={(e) => handleTimelineMouseDown(e, 'end')}
        >
          <div className="handle-dot" />
          <div className="handle-label">
            {formatDate(progressToTime(timeRange[1]))}
          </div>
        </div>

        <div className="slider-current-marker" style={{ left: '50%' }}>
          <div className="current-dot" />
        </div>

        <div className="timeline-labels">
          <span>{formatDate(minTime)}</span>
          <span>{formatDate(maxTime)}</span>
        </div>
      </div>
    </div>
  );
}

export default ChapterTimeline;
