import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Markdown } from '../../types';

interface VideoPlayerProps {
  markdowns: Markdown[];
  videoRef: React.RefObject<HTMLVideoElement>;
  currentTime: number;
  duration: number;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onSeek: (time: number) => void;
  onShowQuiz: (markdown: Markdown) => void;
  onDragMarkdown: (id: string, newTimestamp: number) => void;
}

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const typeColors: Record<string, string> = {
  quiz: '#e53e3e',
  chapter: '#3182ce',
  note: '#38a169'
};

const typeIcons: Record<string, string> = {
  quiz: '?',
  chapter: '◆',
  note: '✎'
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  markdowns,
  videoRef,
  currentTime,
  duration,
  onTimeUpdate,
  onDurationChange,
  onSeek,
  onShowQuiz,
  onDragMarkdown
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredMarkdown, setHoveredMarkdown] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTimestamp, setDragStartTimestamp] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => onTimeUpdate(video.currentTime);
    const handleDurationChange = () => onDurationChange(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => setVolume(video.volume);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [videoRef, onTimeUpdate, onDurationChange]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }, [videoRef]);

  const skipTime = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = Math.max(0, Math.min(duration, video.currentTime + delta));
    video.currentTime = newTime;
  }, [videoRef, duration]);

  const toggleFullscreen = useCallback(() => {
    const container = document.querySelector('.video-container') as HTMLElement | null;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const newTime = ratio * duration;
    onSeek(newTime);
    const video = videoRef.current;
    if (video) video.currentTime = newTime;
  };

  const handleMarkerMouseDown = (e: React.MouseEvent, md: Markdown) => {
    e.stopPropagation();
    setDraggingId(md.id);
    setDragStartX(e.clientX);
    setDragStartTimestamp(md.timestamp);
    e.preventDefault();
  };

  useEffect(() => {
    if (!draggingId) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!trackRef.current || !duration) return;
      const rect = trackRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStartX;
      const deltaTime = (deltaX / rect.width) * duration;
      let newTimestamp = dragStartTimestamp + deltaTime;
      newTimestamp = Math.max(0, Math.min(duration, newTimestamp));
      newTimestamp = Math.round(newTimestamp);
      const el = document.querySelector(`[data-marker-id="${draggingId}"]`) as HTMLElement | null;
      if (el) {
        el.style.left = `${(newTimestamp / duration) * 100}%`;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!trackRef.current || !duration) {
        setDraggingId(null);
        return;
      }
      const rect = trackRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStartX;
      const deltaTime = (deltaX / rect.width) * duration;
      let newTimestamp = dragStartTimestamp + deltaTime;
      newTimestamp = Math.max(0, Math.min(duration, newTimestamp));
      newTimestamp = Math.round(newTimestamp);
      if (newTimestamp !== dragStartTimestamp) {
        onDragMarkdown(draggingId, newTimestamp);
      }
      setDraggingId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, dragStartX, dragStartTimestamp, duration, onDragMarkdown]);

  const handleMarkerClick = (e: React.MouseEvent, md: Markdown) => {
    if (draggingId) return;
    e.stopPropagation();
    onSeek(md.timestamp);
    const video = videoRef.current;
    if (video) video.currentTime = md.timestamp;
  };

  const handleMarkerDoubleClick = (e: React.MouseEvent, md: Markdown) => {
    e.stopPropagation();
    if (md.type === 'quiz') {
      onShowQuiz(md);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    const video = videoRef.current;
    if (video) video.volume = v;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="video-wrapper">
      <div className="video-container">
        <video
          ref={videoRef}
          className="video-element"
          width="100%"
          controls={false}
          onKeyDown={(e) => {
            if (e.code === 'Space') {
              e.preventDefault();
              togglePlay();
            }
          }}
        />

        <div className="controls">
          <div className="markdown-track" ref={trackRef}>
            {markdowns.map((md) => {
              const left = duration > 0 ? (md.timestamp / duration) * 100 : 0;
              const isDragging = draggingId === md.id;
              const isHovered = hoveredMarkdown === md.id;
              return (
                <div
                  key={md.id}
                  data-marker-id={md.id}
                  className={`markdown-marker ${isDragging ? 'dragging' : ''}`}
                  style={{
                    left: `${left}%`,
                    backgroundColor: typeColors[md.type],
                    cursor: isDragging ? 'grabbing' : 'grab',
                    boxShadow: isDragging ? '0 4px 12px rgba(255,255,255,0.3)' : undefined
                  }}
                  onMouseDown={(e) => handleMarkerMouseDown(e, md)}
                  onMouseUp={(e) => handleMarkerClick(e, md)}
                  onDoubleClick={(e) => handleMarkerDoubleClick(e, md)}
                  onMouseEnter={() => setHoveredMarkdown(md.id)}
                  onMouseLeave={() => setHoveredMarkdown(null)}
                >
                  <span className="marker-icon">{typeIcons[md.type]}</span>
                  {isHovered && !isDragging && (
                    <div className="marker-tooltip">
                      <div className="tooltip-time">{formatTime(md.timestamp)}</div>
                      <div className="tooltip-title">{md.title}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div
            className="progress-bar"
            ref={progressRef}
            onClick={handleProgressClick}
          >
            <div
              className="progress-filled"
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className="progress-thumb"
              style={{ left: `${progressPercent}%` }}
            />
          </div>

          <div className="controls-row">
            <div className="controls-left">
              <button
                className="control-btn"
                onClick={togglePlay}
                title={isPlaying ? '暂停' : '播放'}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button
                className="control-btn"
                onClick={() => skipTime(-5)}
                title="后退5秒"
              >
                ⏪5
              </button>
              <button
                className="control-btn"
                onClick={() => skipTime(5)}
                title="前进5秒"
              >
                5⏩
              </button>
              <div className="time-display">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="controls-right">
              <div className="volume-control">
                <span className="volume-icon">🔊</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="volume-slider"
                />
              </div>
              <button
                className="control-btn"
                onClick={toggleFullscreen}
                title={isFullscreen ? '退出全屏' : '全屏'}
              >
                {isFullscreen ? '⛶' : '⛶'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
