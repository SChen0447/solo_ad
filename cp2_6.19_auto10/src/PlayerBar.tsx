import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Song } from './types';

interface PlayerBarProps {
  currentSong: Song | null;
  isPlaying?: boolean;
  progress?: number;
  duration?: number;
  onPlayPause?: () => void;
  onNext: () => void;
  onSeek?: (percent: number) => void;
}

const FIXED_DURATION = 210;

const PlayerBar: React.FC<PlayerBarProps> = ({ currentSong, onNext }) => {
  const progressRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

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

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    lastTimeRef.current = performance.now();

    const animate = (now: number) => {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      setProgress((prev) => {
        const next = prev + delta / (FIXED_DURATION * 1000);
        if (next >= 1) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  const handlePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const percent = calculateProgress(e.clientX);
    setDragProgress(percent);
  };

  const handleSeek = useCallback((percent: number) => {
    setProgress(percent);
  }, []);

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
      handleSeek(percent);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, calculateProgress, handleSeek]);

  const displayProgress = isDragging ? dragProgress : progress;
  const currentTime = displayProgress * FIXED_DURATION;

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
          <button className="control-btn play-btn" onClick={handlePlayPause}>
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
          <span className="time-text">{formatTime(FIXED_DURATION)}</span>
        </div>
      </div>

      <div className="player-extra">
        <span className="volume-icon">🔊</span>
      </div>
    </footer>
  );
};

export default PlayerBar;
