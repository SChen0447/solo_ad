import React, { useState, useEffect, useRef } from 'react';
import type { NowPlaying as NowPlayingType } from '@/utils/socket';

interface NowPlayingProps {
  data: NowPlayingType;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const NowPlaying: React.FC<NowPlayingProps> = ({ data }) => {
  const [currentTime, setCurrentTime] = useState(data.currentTime);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipX, setTooltipX] = useState(0);
  const [tooltipTime, setTooltipTime] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setCurrentTime(data.currentTime);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = window.setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= data.song.duration) {
          return data.song.duration;
        }
        return prev + 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [data.currentTime, data.song.duration, data.startedAt]);

  const progress = (currentTime / data.song.duration) * 100;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.min(Math.max(x / rect.width, 0), 1);
    setTooltipX(x);
    setTooltipTime(percent * data.song.duration);
  };

  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl p-8 h-full card-hover"
      style={{
        backgroundColor: '#1e1e1e',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div className="relative mb-8">
        <div
          className="w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden shadow-2xl animate-spin-slow"
          style={{
            boxShadow: '0 0 60px rgba(29, 185, 84, 0.2)',
          }}
        >
          <img
            src={data.song.coverUrl}
            alt={data.song.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full"
          style={{ backgroundColor: '#121212' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full"
          style={{ backgroundColor: '#1e1e1e' }}
        />
      </div>

      <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center">
        {data.song.title}
      </h1>
      <p className="text-lg md:text-xl mb-8" style={{ color: '#b3b3b3' }}>
        {data.song.artist}
      </p>

      <div className="w-full max-w-md">
        <div
          ref={progressRef}
          className="relative w-full h-1.5 rounded-full cursor-pointer group"
          style={{ backgroundColor: '#4d4d4d' }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onMouseMove={handleMouseMove}
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all group-hover:h-2"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #1db954, #1ed760)',
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-lg"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
          {showTooltip && (
            <div
              className="absolute -top-8 px-2 py-1 rounded text-xs text-white"
              style={{
                left: tooltipX - 20,
                backgroundColor: 'rgba(0,0,0,0.8)',
              }}
            >
              {formatTime(tooltipTime)}
            </div>
          )}
        </div>

        <div className="flex justify-between mt-2 text-sm" style={{ color: '#b3b3b3' }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(data.song.duration)}</span>
        </div>
      </div>
    </div>
  );
};

export default NowPlaying;
