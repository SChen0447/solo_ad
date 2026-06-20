import React, { useEffect, useRef, useState, useCallback } from 'react';

interface MixConsoleProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  zoom: number;
  onPlayPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  onZoomChange: (zoom: number) => void;
}

export const MixConsole: React.FC<MixConsoleProps> = ({
  isPlaying,
  currentTime,
  duration,
  zoom,
  onPlayPause,
  onStop,
  onSeek,
  onZoomChange
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const [displayTime, setDisplayTime] = useState(0);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const getGridInterval = useCallback((): number => {
    const baseInterval = 1;
    if (zoom >= 3) return 0.25;
    if (zoom >= 1.5) return 0.5;
    if (zoom >= 0.8) return 1;
    if (zoom >= 0.4) return 2;
    return 4;
  }, [zoom]);

  const renderGridLines = useCallback(() => {
    if (!timelineRef.current || duration <= 0) return null;

    const lines = [];
    const interval = getGridInterval();
    const totalWidth = duration * zoom * 100;

    for (let time = 0; time <= duration; time += interval) {
      const x = (time / duration) * totalWidth;
      const isMajor = Math.abs(time % 1) < 0.001;

      lines.push(
        <div
          key={time}
          style={{
            position: 'absolute',
            left: `${x}px`,
            top: 0,
            bottom: 0,
            width: '1px',
            background: isMajor ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            pointerEvents: 'none'
          }}
        />
      );

      if (isMajor && time % 2 === 0) {
        lines.push(
          <div
            key={`label-${time}`}
            style={{
              position: 'absolute',
              left: `${x + 4}px`,
              top: '4px',
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.5)',
              fontFamily: "'Orbitron', sans-serif",
              pointerEvents: 'none'
            }}
          >
            {formatTime(time)}
          </div>
        );
      }
    }

    return lines;
  }, [duration, zoom, getGridInterval]);

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || duration <= 0) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const totalWidth = duration * zoom * 100;
    const clickX = e.clientX - rect.left;
    const time = (clickX / totalWidth) * duration;
    const clampedTime = Math.max(0, Math.min(time, duration));

    onSeek(clampedTime);
  }, [duration, zoom, onSeek]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.5, Math.min(4, zoom + delta));
    onZoomChange(newZoom);
  }, [zoom, onZoomChange]);

  useEffect(() => {
    const updatePlayhead = () => {
      setDisplayTime(currentTime);
      animationRef.current = requestAnimationFrame(updatePlayhead);
    };

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updatePlayhead);
    } else {
      setDisplayTime(currentTime);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentTime]);

  const playheadPosition = duration > 0 ? (displayTime / duration) * (duration * zoom * 100) : 0;
  const timelineWidth = duration * zoom * 100;

  return (
    <div style={{
      background: '#1a1a2e',
      borderBottom: '1px solid rgba(108, 99, 255, 0.2)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <style>{`
        .play-btn {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #6c63ff, #00d2ff);
          color: #fff;
          transition: all 0.2s ease;
          box-shadow: 0 4px 16px rgba(108, 99, 255, 0.4);
        }
        .play-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(108, 99, 255, 0.6);
        }
        .play-btn:active {
          transform: scale(0.95);
        }
        .stop-btn {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #555;
          color: #fff;
          transition: all 0.1s ease;
        }
        .stop-btn:hover {
          background: #666;
        }
        .stop-btn:active {
          transform: scale(0.9);
        }
        .playhead {
          transition: left 0.1s ease-out;
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="play-btn"
            onClick={onPlayPause}
            title={isPlaying ? '暂停 (空格键)' : '播放 (空格键)'}
          >
            <div style={{
              width: 0,
              height: 0,
              borderStyle: 'solid',
              transform: isPlaying ? 'rotate(90deg)' : 'none',
              transition: 'transform 0.2s ease',
              ...(isPlaying
                ? {
                  borderWidth: '0 8px 12px 8px',
                  borderColor: 'transparent transparent #fff transparent'
                }
                : {
                  borderWidth: '10px 0 10px 16px',
                  borderColor: 'transparent transparent transparent #fff',
                  marginLeft: '4px'
                }
              )
            }} />
          </button>

          <button
            className="stop-btn"
            onClick={onStop}
            title="停止"
          >
            <div style={{
              width: '18px',
              height: '18px',
              background: '#fff',
              borderRadius: '2px'
            }} />
          </button>
        </div>

        <div style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '24px',
          fontWeight: 700,
          color: '#00d2ff',
          minWidth: '140px',
          textShadow: '0 0 20px rgba(0, 210, 255, 0.5)',
          letterSpacing: '1px'
        }}>
          {formatTime(displayTime)}
        </div>

        <div style={{
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.5)',
          fontFamily: "'Orbitron', sans-serif"
        }}>
          / {formatTime(duration)}
        </div>

        <div style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>缩放:</span>
          <button
            onClick={() => onZoomChange(Math.max(0.5, zoom - 0.25))}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: '1px solid rgba(108, 99, 255, 0.4)',
              background: 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(108, 99, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            −
          </button>
          <div style={{
            minWidth: '60px',
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: 600,
            color: '#a29bfe'
          }}>
            {zoom.toFixed(1)}x
          </div>
          <button
            onClick={() => onZoomChange(Math.min(4, zoom + 0.25))}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: '1px solid rgba(108, 99, 255, 0.4)',
              background: 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(108, 99, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            +
          </button>
          <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
            (滚轮缩放)
          </span>
        </div>
      </div>

      <div
        ref={timelineRef}
        onClick={handleTimelineClick}
        onWheel={handleWheel}
        style={{
          position: 'relative',
          height: '40px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '4px',
          overflowX: 'auto',
          overflowY: 'hidden',
          cursor: 'pointer',
          minHeight: '40px'
        }}
      >
        <div style={{
          position: 'relative',
          width: `${Math.max(timelineWidth, 100)}px`,
          height: '100%'
        }}>
          {renderGridLines()}

          <div
            ref={playheadRef}
            className="playhead"
            style={{
              position: 'absolute',
              left: `${playheadPosition}px`,
              top: 0,
              width: '2px',
              height: '100%',
              background: '#ff4444',
              boxShadow: '0 0 8px rgba(255, 68, 68, 0.8), 0 0 16px rgba(255, 68, 68, 0.4)',
              pointerEvents: 'none',
              zIndex: 10
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-6px',
              left: '-5px',
              width: '12px',
              height: '12px',
              background: '#ff4444',
              borderRadius: '50%',
              boxShadow: '0 0 8px rgba(255, 68, 68, 0.8)'
            }} />
          </div>
        </div>
      </div>
    </div>
  );
};
