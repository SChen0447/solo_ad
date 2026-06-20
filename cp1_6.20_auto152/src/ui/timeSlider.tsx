import { useEffect, useRef } from 'react';
import { formatTimeShort } from '@/utils/constants';

interface TimeSliderProps {
  startTime: number;
  endTime: number;
  currentTime: number;
  isPlaying: boolean;
  onTimeChange: (time: number) => void;
  onPlayToggle: () => void;
}

export function TimeSlider({
  startTime,
  endTime,
  currentTime,
  isPlaying,
  onTimeChange,
  onPlayToggle,
}: TimeSliderProps) {
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        const step = (endTime - startTime) / 500;
        const next = currentTime + step;
        if (next >= endTime) {
          onTimeChange(endTime);
        } else {
          onTimeChange(next);
        }
      }, 50);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, currentTime, startTime, endTime, onTimeChange]);

  const progress =
    endTime > startTime
      ? ((currentTime - startTime) / (endTime - startTime)) * 100
      : 0;

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ratio = parseFloat(e.target.value) / 100;
    const t = startTime + ratio * (endTime - startTime);
    onTimeChange(t);
  };

  const midTime = startTime + (endTime - startTime) / 2;

  return (
    <div className="time-slider-container">
      <div className="time-slider-track">
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress}
          onChange={handleSlider}
          className="time-slider"
          style={{
            background: `linear-gradient(to right, #ff4444 0%, #ff4444 ${progress}%, #333333 ${progress}%, #333333 100%)`,
            height: '6px',
            borderRadius: '3px',
          }}
        />
        <div className="time-labels">
          <span>{formatTimeShort(startTime)}</span>
          <span>{formatTimeShort(midTime)}</span>
          <span>{formatTimeShort(endTime)}</span>
        </div>
      </div>
      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
        <button
          className="play-button"
          onClick={onPlayToggle}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24">
              <polygon points="6,3 20,12 6,21" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default TimeSlider;
