import React, { useState, useEffect, useRef, useCallback } from 'react';
import './TimeSliderControl.css';

interface TimeSliderControlProps {
  minTime: number;
  maxTime: number;
  currentTime: number;
  onTimeChange: (time: number | ((prev: number) => number)) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
}

export const TimeSliderControl: React.FC<TimeSliderControlProps> = ({
  minTime,
  maxTime,
  currentTime,
  onTimeChange,
  isPlaying,
  onPlayPause,
  playbackSpeed,
  onSpeedChange
}) => {
  const [sliderScale, setSliderScale] = useState(1);
  const sliderRef = useRef<HTMLInputElement>(null);
  const playIntervalRef = useRef<number | null>(null);

  const formatDate = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }, []);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    onTimeChange(value);
  }, [onTimeChange]);

  const handleSpeedChange = useCallback((speed: number) => {
    setSliderScale(1.2);
    setTimeout(() => setSliderScale(1), 300);
    onSpeedChange(speed);
  }, [onSpeedChange]);

  useEffect(() => {
    if (isPlaying) {
      const speedMultiplier = playbackSpeed;
      const totalDuration = maxTime - minTime;
      const stepPerFrame = totalDuration / (30000 / speedMultiplier);

      playIntervalRef.current = window.setInterval(() => {
        onTimeChange(prev => {
          const next = prev + stepPerFrame;
          if (next >= maxTime) {
            onPlayPause();
            return minTime;
          }
          return next;
        });
      }, 16);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, minTime, maxTime, onTimeChange, onPlayPause]);

  const progress = maxTime > minTime ? ((currentTime - minTime) / (maxTime - minTime)) * 100 : 0;

  return (
    <div className="time-slider-container">
      <div className="time-display">
        <span className="time-label">{formatDate(minTime)}</span>
        <span className="time-current">{formatDate(currentTime)}</span>
        <span className="time-label">{formatDate(maxTime)}</span>
      </div>

      <div className="slider-wrapper">
        <div 
          className="slider-progress"
          style={{ width: `${progress}%` }}
        />
        <input
          ref={sliderRef}
          type="range"
          min={minTime}
          max={maxTime}
          value={currentTime}
          onChange={handleSliderChange}
          className="time-slider"
          style={{
            '--slider-scale': sliderScale
          } as React.CSSProperties}
        />
      </div>

      <div className="controls-row">
        <button
          className={`play-button ${isPlaying ? 'playing' : ''}`}
          onClick={onPlayPause}
        >
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="speed-controls">
          {[0.5, 1, 2].map(speed => (
            <button
              key={speed}
              className={`speed-button ${playbackSpeed === speed ? 'active' : ''}`}
              onClick={() => handleSpeedChange(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
