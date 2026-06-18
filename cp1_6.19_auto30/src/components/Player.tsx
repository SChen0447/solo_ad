import React, { useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import useStore from '../store/useStore';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const Player: React.FC = () => {
  const {
    player,
    togglePlay,
    nextTrack,
    prevTrack,
    setCurrentTime,
    setDuration
  } = useStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const { currentTrack, isPlaying, currentTime, duration, playlist } = player;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    audio.src = currentTrack.audioUrl || '';
    audio.load();
    if (isPlaying) {
      audio.play().catch(() => {});
    }
  }, [currentTrack]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      setCurrentTime(audio.currentTime);
    }
  }, [setCurrentTime]);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      setDuration(audio.duration);
    }
  }, [setDuration]);

  const handleEnded = useCallback(() => {
    nextTrack();
  }, [nextTrack]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const progress = progressRef.current;
    if (!audio || !progress) return;

    const rect = progress.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handlePrevious = () => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
    } else {
      prevTrack();
    }
  };

  if (!currentTrack) return null;

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hasPrev = playlist.length > 1;
  const hasNext = playlist.length > 1;

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      <div className="player-container">
        <div className="player-content">
          <div className="track-info">
            <img
              src={currentTrack.coverUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%23667eea" stroke-width="2"%3E%3Ccircle cx="12" cy="12" r="10"/%3E%3Cpolygon points="10 8 16 12 10 16 10 8"/%3E%3C/svg%3E'}
              alt={currentTrack.name}
              className="track-cover"
            />
            <div className="track-details">
              <div className="track-name">{currentTrack.name}</div>
              <div className="track-artist">{currentTrack.artist}</div>
            </div>
          </div>

          <div className="player-controls">
            <button
              className={`control-btn ${!hasPrev ? 'disabled' : ''}`}
              onClick={handlePrevious}
              disabled={!hasPrev}
            >
              <SkipBack size={20} />
            </button>
            <button className="control-btn play-pause-btn" onClick={togglePlay}>
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>
            <button
              className={`control-btn ${!hasNext ? 'disabled' : ''}`}
              onClick={nextTrack}
              disabled={!hasNext}
            >
              <SkipForward size={20} />
            </button>
          </div>

          <div className="player-progress">
            <span className="time-text">{formatTime(currentTime)}</span>
            <div
              ref={progressRef}
              className="progress-bar"
              onClick={handleProgressClick}
            >
              <div
                className="progress-fill"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="time-text">{formatTime(duration)}</span>
          </div>

          <div className="player-right">
            <div className="volume-control">
              <Volume2 size={18} />
            </div>
          </div>
        </div>

        <style>{`
          .player-container {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 80px;
            background: linear-gradient(135deg, #0f0c29 0%, #302b63 100%);
            border-top: 1px solid var(--border-color);
            z-index: 1000;
            padding: 0 24px;
            display: flex;
            align-items: center;
          }

          .player-content {
            width: 100%;
            max-width: 1400px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 300px 1fr 300px;
            gap: 24px;
            align-items: center;
          }

          .track-info {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
          }

          .track-cover {
            width: 48px;
            height: 48px;
            border-radius: 6px;
            object-fit: cover;
            flex-shrink: 0;
          }

          .track-details {
            min-width: 0;
          }

          .track-name {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .track-artist {
            font-size: 12px;
            color: var(--text-secondary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .player-controls {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
          }

          .control-btn {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            color: var(--text-primary);
            transition: all 0.2s ease;
          }

          .control-btn:hover:not(.disabled) {
            background: rgba(255, 255, 255, 0.1);
            transform: scale(1.1);
          }

          .control-btn.disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }

          .play-pause-btn {
            width: 48px;
            height: 48px;
            background: var(--accent-gradient);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }

          .play-pause-btn:hover {
            box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
          }

          .player-progress {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .time-text {
            font-size: 12px;
            color: var(--text-secondary);
            font-variant-numeric: tabular-nums;
            min-width: 40px;
            text-align: center;
          }

          .progress-bar {
            flex: 1;
            height: 4px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 2px;
            cursor: pointer;
            position: relative;
            transition: height 0.2s ease;
          }

          .progress-bar:hover {
            height: 6px;
          }

          .progress-fill {
            height: 100%;
            background: var(--accent-start);
            border-radius: 2px;
            transition: width 0.1s linear;
          }

          .player-right {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 12px;
          }

          .volume-control {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--text-secondary);
          }

          @media (max-width: 768px) {
            .player-container {
              height: auto;
              padding: 12px 16px;
            }

            .player-content {
              grid-template-columns: 1fr;
              gap: 12px;
            }

            .track-info {
              order: 1;
            }

            .player-controls {
              order: 2;
            }

            .player-progress {
              order: 3;
            }

            .player-right {
              display: none;
            }
          }
        `}</style>
      </div>
    </>
  );
};

export default Player;
