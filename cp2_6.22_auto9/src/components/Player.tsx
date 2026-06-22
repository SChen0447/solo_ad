import { useState, useEffect, useRef, useCallback } from 'react';
import {
  saveProgressToLocal,
  getEpisodeProgress,
  updateProgress,
  type Episode,
} from '@/api/api';
import './Player.css';

interface PlayerProps {
  episode: Episode | null;
  podcastTitle?: string;
}

export default function Player({ episode, podcastTitle }: PlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (episode) {
      const savedProgress = getEpisodeProgress(episode.id);
      const initialTime = savedProgress?.currentTime || 0;
      const dur = episode.duration || savedProgress?.duration || 0;
      setCurrentTime(initialTime);
      setDuration(dur);
      setIsPlaying(false);
      hasInitialized.current = true;
    } else {
      hasInitialized.current = false;
    }
  }, [episode]);

  useEffect(() => {
    if (isPlaying && episode) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1;
          if (next >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return next;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, duration, episode]);

  useEffect(() => {
    if (episode && hasInitialized.current) {
      saveProgressToLocal(episode.id, currentTime, duration);
      updateProgress(episode.id, currentTime, duration).catch(() => {});
    }
  }, [currentTime, episode, duration]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (!episode) return;
    setIsPlaying((prev) => !prev);
  };

  const handleSkipBackward = () => {
    if (!episode) return;
    setCurrentTime((prev) => Math.max(0, prev - 15));
  };

  const handleSkipForward = () => {
    if (!episode) return;
    setCurrentTime((prev) => Math.min(duration, prev + 15));
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!episode || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(duration, percent * duration));
    setCurrentTime(newTime);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isCompleted = currentTime >= duration * 0.95;

  if (!episode) {
    return (
      <div className="player-container">
        <div className="player-empty">
          🎧 选择一个节目开始播放
        </div>
      </div>
    );
  }

  return (
    <div className="player-container">
      <div className="player-content">
        <img
          src={episode.coverUrl}
          alt={episode.title}
          className="player-cover"
        />
        <div className="player-info">
          <h4 className="player-title">{episode.title}</h4>
          {podcastTitle && <p className="player-podcast">{podcastTitle}</p>}
        </div>
        <div className="player-controls">
          <button
            className="control-btn"
            onClick={handleSkipBackward}
            title="后退15秒"
          >
            ⏪
          </button>
          <button
            className="control-btn play-btn"
            onClick={handlePlayPause}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            className="control-btn"
            onClick={handleSkipForward}
            title="快进15秒"
          >
            ⏩
          </button>
        </div>
      </div>
      <div className="player-progress">
        <span className="progress-time">{formatTime(currentTime)}</span>
        <div
          className="progress-bar-container"
          onClick={handleProgressClick}
        >
          <div
            className={`progress-bar-fill ${isCompleted ? 'completed' : ''}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="progress-time">{formatTime(duration)}</span>
      </div>
    </div>
  );
}
