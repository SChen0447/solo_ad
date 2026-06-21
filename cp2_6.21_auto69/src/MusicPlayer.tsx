import React, { useState, useRef, useEffect, useCallback } from 'react';

const MusicPlayer: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.5);
  const audioRef = useRef<HTMLAudioElement>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const guqinNotes = [130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94];

  const playGuqinNote = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    const noteIndex = Math.floor(Math.random() * guqinNotes.length);
    const frequency = guqinNotes[noteIndex];

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * 0.3, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 2.5);

    oscillatorRef.current = oscillator;
    gainNodeRef.current = gainNode;
  }, [volume, guqinNotes]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        playGuqinNote();
      }, 1800 + Math.random() * 1200);
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
  }, [isPlaying, playGuqinNote]);

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const toggleExpand = () => {
    setIsExpanded(prev => !prev);
  };

  return (
    <>
      <audio ref={audioRef} loop />

      {isExpanded && (
        <div className="player-panel">
          <div className="player-header">
            <span className="player-title">古琴雅乐</span>
          </div>

          <div className="track-info">
            <span className="track-name">《高山流水》</span>
          </div>

          <div className="play-controls">
            <button
              className="play-pause-btn"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </button>

            <div className="volume-control">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#D7CCC8">
                <polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="#D7CCC8" strokeWidth="2" fill="none" />
              </svg>
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
          </div>
        </div>
      )}

      <button
        className={`floating-btn ${isExpanded ? 'expanded' : ''}`}
        onClick={toggleExpand}
        title={isExpanded ? '收起播放器' : '展开播放器'}
      >
        <svg width="24" height="24" viewBox="0 0 48 48">
          <ellipse cx="24" cy="24" rx="18" ry="10" fill="none" stroke="white" strokeWidth="1.5" />
          <line x1="14" y1="18" x2="14" y2="30" stroke="white" strokeWidth="1.5" />
          <line x1="20" y1="16" x2="20" y2="32" stroke="white" strokeWidth="1.5" />
          <line x1="26" y1="16" x2="26" y2="32" stroke="white" strokeWidth="1.5" />
          <line x1="32" y1="18" x2="32" y2="30" stroke="white" strokeWidth="1.5" />
          {isPlaying && (
            <>
              <circle cx="17" cy="24" r="1.5" fill="#FFD54F">
                <animate attributeName="cy" values="24;20;24" dur="0.8s" repeatCount="indefinite" />
              </circle>
              <circle cx="24" cy="24" r="1.5" fill="#FFD54F">
                <animate attributeName="cy" values="24;18;24" dur="0.6s" repeatCount="indefinite" />
              </circle>
              <circle cx="31" cy="24" r="1.5" fill="#FFD54F">
                <animate attributeName="cy" values="24;22;24" dur="1s" repeatCount="indefinite" />
              </circle>
            </>
          )}
        </svg>
      </button>

      <style>{`
        .floating-btn {
          position: fixed;
          right: 24px;
          bottom: 24px;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background-color: #5D4037;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
          transition: background-color 0.3s ease-out, transform 0.3s ease-out;
          z-index: 200;
        }

        .floating-btn:hover {
          background-color: #4E342E;
          transform: scale(1.05);
        }

        .floating-btn.expanded {
          right: 24px;
          bottom: 180px;
        }

        .player-panel {
          position: fixed;
          right: 24px;
          bottom: 84px;
          width: 220px;
          height: 140px;
          background-color: #3E2723;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          z-index: 199;
          animation: slideUp 0.3s ease-out;
        }

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

        .player-header {
          margin-bottom: 8px;
        }

        .player-title {
          color: #D7CCC8;
          font-family: 'KaiTi', 'STKaiti', serif;
          font-size: 14px;
        }

        .track-info {
          margin-bottom: 16px;
        }

        .track-name {
          color: #FAF0E6;
          font-family: 'KaiTi', 'STKaiti', serif;
          font-size: 18px;
        }

        .play-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .play-pause-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: #5D4037;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.3s ease-out;
          flex-shrink: 0;
        }

        .play-pause-btn:hover {
          background-color: #4E342E;
        }

        .volume-control {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .volume-slider {
          -webkit-appearance: none;
          appearance: none;
          flex: 1;
          height: 4px;
          background: #5D4037;
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }

        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #D7CCC8;
          cursor: pointer;
          transition: transform 0.2s ease-out;
        }

        .volume-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        .volume-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #D7CCC8;
          cursor: pointer;
          border: none;
        }

        @media (max-width: 480px) {
          .floating-btn {
            right: 16px;
            bottom: 16px;
            width: 44px;
            height: 44px;
          }

          .floating-btn.expanded {
            right: 16px;
            bottom: 172px;
          }

          .player-panel {
            right: 16px;
            bottom: 76px;
            width: 200px;
            height: 130px;
          }
        }
      `}</style>
    </>
  );
};

export default MusicPlayer;
