import React, { useState, useEffect, useRef } from 'react';
import type { SnapshotData, LineData } from '../types';
import { canvasApi } from '../api/canvasApi';

interface TimeTravelProps {
  firstTime: number;
  onTimeChange: (lines: LineData[] | null, stats: SnapshotData | null) => void;
}

export const TimeTravel: React.FC<TimeTravelProps> = ({ firstTime, onTimeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTimeTraveling, setIsTimeTraveling] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(Math.floor(Date.now() / 1000));
  const [stats, setStats] = useState<SnapshotData | null>(null);
  const debounceRef = useRef<number | null>(null);

  const maxTime = Math.floor(Date.now() / 1000);
  const minTime = firstTime || maxTime - 3600;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSliderChange = async (timestamp: number) => {
    setCurrentTime(timestamp);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(async () => {
      try {
        const snapshot = await canvasApi.getSnapshot(Math.floor(timestamp));
        setStats(snapshot);
        onTimeChange(snapshot.lines, snapshot);
      } catch (e) {
        console.error('Failed to fetch snapshot:', e);
      }
    }, 100);
  };

  const handleStartTravel = () => {
    setIsTimeTraveling(true);
    handleSliderChange(minTime);
  };

  const handleExit = () => {
    setIsTimeTraveling(false);
    setIsOpen(false);
    setStats(null);
    onTimeChange(null, null);
  };

  const handleToggle = () => {
    if (isOpen) {
      handleExit();
    } else {
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (isOpen && !isTimeTraveling) {
      setCurrentTime(maxTime);
    }
  }, [isOpen, isTimeTraveling, maxTime]);

  const progress = isTimeTraveling
    ? ((currentTime - minTime) / (maxTime - minTime)) * 100
    : 100;

  return (
    <>
      <button
        onClick={handleToggle}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: 'none',
          background: isOpen
            ? 'linear-gradient(135deg, #8B7355, #6B5344)'
            : 'linear-gradient(135deg, #d4c4a8, #c4b393)',
          color: '#fff',
          fontSize: 24,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(93, 78, 55, 0.3)',
          zIndex: 100,
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(93, 78, 55, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(93, 78, 55, 0.3)';
        }}
      >
        ⏰
      </button>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 100,
            right: 24,
            left: 24,
            maxWidth: 500,
            marginLeft: 'auto',
            background: 'rgba(255, 252, 245, 0.9)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: 20,
            padding: 20,
            boxShadow: '0 8px 32px rgba(93, 78, 55, 0.15)',
            border: '1px solid rgba(139, 115, 85, 0.15)',
            zIndex: 100,
            animation: 'slideUp 0.3s ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 18 }}>⏰</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#5D4E37' }}>
              时光回溯
            </span>
            {isTimeTraveling && (
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 10,
                  background: 'rgba(139, 115, 85, 0.15)',
                  color: '#8B7355',
                  fontWeight: 500,
                }}
              >
                正在浏览
              </span>
            )}
          </div>

          {stats && isTimeTraveling && (
            <div
              style={{
                display: 'flex',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  background: 'rgba(139, 115, 85, 0.08)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 700, color: '#5D4E37' }}>
                  {stats.online_users}
                </div>
                <div style={{ fontSize: 11, color: '#8B7355', marginTop: 2 }}>
                  在线人数
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  background: 'rgba(139, 115, 85, 0.08)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 700, color: '#5D4E37' }}>
                  +{stats.new_lines}
                </div>
                <div style={{ fontSize: 11, color: '#8B7355', marginTop: 2 }}>
                  新增线条
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  background: 'rgba(139, 115, 85, 0.08)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 700, color: '#5D4E37' }}>
                  {stats.total_lines}
                </div>
                <div style={{ fontSize: 11, color: '#8B7355', marginTop: 2 }}>
                  总线条数
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 8,
                fontSize: 12,
                color: '#8B7355',
              }}
            >
              <span>{formatTime(minTime)}</span>
              <span
                style={{
                  fontWeight: 600,
                  color: '#5D4E37',
                  fontSize: 13,
                }}
              >
                {formatTime(currentTime)}
              </span>
              <span>{formatTime(maxTime)}</span>
            </div>

            <div style={{ position: 'relative', height: 8 }}>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '100%',
                  background: 'rgba(139, 115, 85, 0.15)',
                  borderRadius: 4,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #d4c4a8, #8B7355)',
                  borderRadius: 4,
                  transition: 'width 0.1s ease',
                }}
              />
              <input
                type="range"
                min={minTime}
                max={maxTime}
                step={60}
                value={currentTime}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!isTimeTraveling) {
                    setIsTimeTraveling(true);
                  }
                  handleSliderChange(val);
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                  margin: 0,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `calc(${progress}% - 8px)`,
                  width: 16,
                  height: 16,
                  background: '#fff',
                  borderRadius: '50%',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  transition: 'left 0.1s ease',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {!isTimeTraveling ? (
              <button
                onClick={handleStartTravel}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #8B7355, #6B5344)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                开始时光旅行
              </button>
            ) : (
              <button
                onClick={handleExit}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #d4c4a8, #c4b393)',
                  color: '#5D4E37',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                回到现在
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};
