import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Song } from './types';

interface PlayerBarProps {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  onPlayPause: () => void;
  onNext: () => void;
  onSeek: (percent: number) => void;
}

const PlayerBar: React.FC<PlayerBarProps> = ({
  currentSong,
  isPlaying,
  progress,
  duration,
  onPlayPause,
  onNext,
  onSeek,
}) => {
  const progressRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(progress);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const calculateProgress = useCallback((clientX: number) => {
    if (!progressRef.current) return 0;
    const rect = progressRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    return percent;
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const percent = calculateProgress(e.clientX);
    setDragProgress(percent);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const percent = calculateProgress(e.clientX);
      setDragProgress(percent);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDragging) return;
      const percent = calculateProgress(e.clientX);
      setIsDragging(false);
      onSeek(percent);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, calculateProgress, onSeek]);

  const displayProgress = isDragging ? dragProgress : progress;
  const currentTime = displayProgress * duration;

  return (
    <footer className="player-bar">
      <div className="player-song-info">
        {currentSong ? (
          <>
            <div className={`player-cover ${isPlaying ? 'spinning' : ''}`}>
              <img
                src={currentSong.cover || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=music%20album%20cover%20dark%20abstract&image_size=square'}
                alt={currentSong.title}
              />
            </div>
            <div className="player-text">
              <span className="player-title">{currentSong.title}</span>
              <span className="player-artist">{currentSong.artist}</span>
            </div>
          </>
        ) : (
          <div className="player-empty">
            <span>暂无播放歌曲</span>
          </div>
        )}
      </div>

      <div className="player-controls">
        <div className="control-buttons">
          <button className="control-btn play-btn" onClick={onPlayPause}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="control-btn next-btn" onClick={onNext}>
            ⏭
          </button>
        </div>
        <div className="progress-wrapper">
          <span className="time-text">{formatTime(currentTime)}</span>
          <div
            className="progress-bar"
            ref={progressRef}
            onMouseDown={handleMouseDown}
          >
            <div
              className="progress-fill"
              style={{ width: `${displayProgress * 100}%` }}
            />
            <div
              className="progress-thumb"
              style={{ left: `${displayProgress * 100}%` }}
            />
          </div>
          <span className="time-text">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="player-extra">
        <span className="volume-icon">🔊</span>
      </div>
    </footer>
  );
};

export default PlayerBar;
