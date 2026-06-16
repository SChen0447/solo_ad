import React from 'react';

interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onReset: () => void;
  onSeek: (time: number) => void;
  disabled: boolean;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onReset,
  onSeek,
  disabled,
}) => {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    onSeek(percent * duration);
  };

  return (
    <div className={`player-controls ${disabled ? 'disabled' : ''}`}>
      <div className="progress-container" onClick={handleProgressClick}>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
          <div
            className="progress-handle"
            style={{ left: `${progress}%` }}
          />
        </div>
        <div className="time-display">
          <span className="time-current">{formatTime(currentTime)}</span>
          <span className="time-total">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="control-buttons">
        <button
          className="control-btn reset-btn"
          onClick={onReset}
          disabled={disabled}
          aria-label="重置"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>

        <button
          className="control-btn play-btn"
          onClick={onPlayPause}
          disabled={disabled}
          aria-label={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="control-btn-spacer" />
      </div>
    </div>
  );
};
