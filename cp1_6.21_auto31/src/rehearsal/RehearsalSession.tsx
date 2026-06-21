import { useState, useEffect, useRef, useCallback } from 'react';
import type { Rehearsal, Song } from '../types';
import { useSocket } from '../hooks/useSocket';
import './RehearsalSession.css';

interface RehearsalSessionProps {
  rehearsal: Rehearsal;
  songs: Song[];
  onEnd: () => void;
}

export function RehearsalSession({ rehearsal, songs, onEnd }: RehearsalSessionProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [songProgress, setSongProgress] = useState<number[]>(
    rehearsal.songs.map(() => 0)
  );
  const [songTimes, setSongTimes] = useState<number[]>(
    rehearsal.songs.map(() => 0)
  );
  const [ratings, setRatings] = useState<{ score: number; feedback: string }[]>(
    rehearsal.songs.map(() => ({ score: 0, feedback: '' }))
  );
  const [showRating, setShowRating] = useState(false);
  const [pitchDetectActive, setPitchDetectActive] = useState(false);
  const [currentPitch, setCurrentPitch] = useState<number | null>(null);
  
  const intervalRef = useRef<number | null>(null);
  const songStartRef = useRef<number>(0);

  const {
    joinRehearsal,
    leaveRehearsal,
    startRehearsal,
    stopRehearsal,
    tickRehearsal,
    changeSong,
    submitRating,
    onRehearsalStarted,
    onRehearsalStopped,
    onRehearsalTicking,
    onSongChanged,
  } = useSocket();

  useEffect(() => {
    joinRehearsal(rehearsal._id);

    const cleanupStarted = onRehearsalStarted(() => {
      setIsRunning(true);
    });

    const cleanupStopped = onRehearsalStopped(() => {
      setIsRunning(false);
    });

    const cleanupTicking = onRehearsalTicking((data: any) => {
      setElapsed(data.elapsed);
      setCurrentSongIndex(data.currentSongIndex);
    });

    const cleanupSongChanged = onSongChanged((data: any) => {
      setCurrentSongIndex(data.songIndex);
    });

    return () => {
      leaveRehearsal(rehearsal._id);
      cleanupStarted();
      cleanupStopped();
      cleanupTicking();
      cleanupSongChanged();
    };
  }, [rehearsal._id, joinRehearsal, leaveRehearsal, onRehearsalStarted, onRehearsalStopped, onRehearsalTicking, onSongChanged]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setElapsed((prev) => prev + 1);
        tickRehearsal(rehearsal._id, elapsed + 1, currentSongIndex);
        
        if (songStartRef.current > 0) {
          const songElapsed = Math.floor((Date.now() - songStartRef.current) / 1000);
          setSongTimes((prev) => {
            const newTimes = [...prev];
            newTimes[currentSongIndex] = songElapsed;
            return newTimes;
          });
        }
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
  }, [isRunning, currentSongIndex, rehearsal._id, tickRehearsal, elapsed]);

  const handleStart = () => {
    setIsRunning(true);
    startRehearsal(rehearsal._id, Date.now());
    songStartRef.current = Date.now();
  };

  const handlePause = () => {
    setIsRunning(false);
    stopRehearsal(rehearsal._id);
  };

  const handleNextSong = () => {
    if (currentSongIndex < rehearsal.songs.length - 1) {
      const nextIndex = currentSongIndex + 1;
      setCurrentSongIndex(nextIndex);
      changeSong(rehearsal._id, nextIndex);
      songStartRef.current = Date.now();
    }
  };

  const handlePrevSong = () => {
    if (currentSongIndex > 0) {
      const prevIndex = currentSongIndex - 1;
      setCurrentSongIndex(prevIndex);
      changeSong(rehearsal._id, prevIndex);
      songStartRef.current = Date.now();
    }
  };

  const handleProgressChange = (value: number) => {
    setSongProgress((prev) => {
      const newProgress = [...prev];
      newProgress[currentSongIndex] = value;
      return newProgress;
    });
  };

  const handleScoreChange = (value: number) => {
    setRatings((prev) => {
      const newRatings = [...prev];
      newRatings[currentSongIndex] = { ...newRatings[currentSongIndex], score: value };
      return newRatings;
    });
  };

  const handleFeedbackChange = (value: string) => {
    setRatings((prev) => {
      const newRatings = [...prev];
      newRatings[currentSongIndex] = { ...newRatings[currentSongIndex], feedback: value };
      return newRatings;
    });
  };

  const handleSubmitRating = () => {
    const rating = ratings[currentSongIndex];
    const songId = rehearsal.songs[currentSongIndex].songId;
    submitRating(rehearsal._id, songId, rating.score, rating.feedback);
    setShowRating(false);
  };

  const togglePitchDetection = useCallback(() => {
    if (pitchDetectActive) {
      setPitchDetectActive(false);
      setCurrentPitch(null);
    } else {
      setPitchDetectActive(true);
      simulatePitchDetection();
    }
  }, [pitchDetectActive]);

  const simulatePitchDetection = () => {
    const simulate = () => {
      if (!pitchDetectActive) return;
      const currentSong = songs.find((s) => s._id === rehearsal.songs[currentSongIndex]?.songId);
      if (currentSong) {
        const baseFreq = 220 + (currentSong.bpm / 4);
        const variation = Math.random() * 20 - 10;
        setCurrentPitch(Math.round(baseFreq + variation));
      }
      setTimeout(simulate, 500);
    };
    simulate();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSongTitle = (songId: string) => {
    return songs.find((s) => s._id === songId)?.title || '未知曲目';
  };

  const currentSong = rehearsal.songs[currentSongIndex];
  const currentSongData = songs.find((s) => s._id === currentSong?.songId);

  const calculateOverallProgress = () => {
    if (songProgress.length === 0) return 0;
    return Math.round(songProgress.reduce((sum, p) => sum + p, 0) / songProgress.length);
  };

  return (
    <div className="rehearsal-session">
      <div className="session-header glass-effect">
        <button className="back-btn" onClick={onEnd}>
          ← 返回
        </button>
        <h2 className="session-title">{rehearsal.title}</h2>
        <div className="session-status">
          <span className={`status-indicator ${isRunning ? 'running' : 'paused'}`}>
            {isRunning ? '进行中' : '已暂停'}
          </span>
        </div>
      </div>

      <div className="timer-section">
        <div className="main-timer">
          <div className="timer-display">
            <span className="timer-value">{formatTime(elapsed)}</span>
            <span className="timer-label">总用时</span>
          </div>
          <div className="timer-controls">
            {!isRunning ? (
              <button className="control-btn play" onClick={handleStart}>
                ▶ 开始
              </button>
            ) : (
              <button className="control-btn pause" onClick={handlePause}>
                ⏸ 暂停
              </button>
            )}
          </div>
        </div>

        <div className="song-timer">
          <div className="song-timer-display">
            <span className="song-timer-value">{formatTime(songTimes[currentSongIndex] || 0)}</span>
            <span className="song-timer-label">当前曲目用时</span>
          </div>
        </div>
      </div>

      <div className="song-navigation">
        <button
          className="nav-btn prev"
          onClick={handlePrevSong}
          disabled={currentSongIndex === 0}
        >
          ← 上一首
        </button>
        
        <div className="current-song-info glass-effect">
          <div className="song-index">
            第 {currentSongIndex + 1} / {rehearsal.songs.length} 首
          </div>
          <h3 className="current-song-title">
            {currentSong ? getSongTitle(currentSong.songId) : '-'}
          </h3>
          {currentSongData && (
            <div className="song-details">
              <span>{currentSongData.key}</span>
              <span>•</span>
              <span>{currentSongData.bpm} BPM</span>
            </div>
          )}
        </div>

        <button
          className="nav-btn next"
          onClick={handleNextSong}
          disabled={currentSongIndex === rehearsal.songs.length - 1}
        >
          下一首 →
        </button>
      </div>

      <div className="progress-section glass-effect">
        <div className="section-label">排练进度</div>
        <div className="overall-progress">
          <div className="progress-ring">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="rgba(212, 175, 55, 0.15)"
                strokeWidth="8"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#d4af37"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${calculateOverallProgress() * 3.14} 314`}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            </svg>
            <div className="progress-ring-text">
              <span className="progress-value">{calculateOverallProgress()}%</span>
              <span className="progress-label">总进度</span>
            </div>
          </div>
        </div>

        <div className="song-progress-list">
          {rehearsal.songs.map((rs, index) => (
            <div key={rs.songId} className={`song-progress-item ${index === currentSongIndex ? 'active' : ''}`}>
              <span className="song-name-mini">{getSongTitle(rs.songId)}</span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${songProgress[index] || 0}%` }}
                />
              </div>
              <span className="progress-percent">{songProgress[index] || 0}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="current-song-controls glass-effect">
        <div className="section-label">当前曲目进度</div>
        <input
          type="range"
          min="0"
          max="100"
          value={songProgress[currentSongIndex] || 0}
          onChange={(e) => handleProgressChange(parseInt(e.target.value))}
          className="progress-slider"
        />
        
        <div className="pitch-section">
          <button
            className={`pitch-btn ${pitchDetectActive ? 'active' : ''}`}
            onClick={togglePitchDetection}
          >
            {pitchDetectActive ? '🔴 音准检测中' : '🎵 启动音准检测'}
          </button>
          {pitchDetectActive && currentPitch !== null && (
            <div className="pitch-display">
              当前音高: <span className="pitch-value">{currentPitch} Hz</span>
            </div>
          )}
        </div>

        <button className="rating-btn" onClick={() => setShowRating(true)}>
          ⭐ 为当前曲目打分
        </button>
      </div>

      {showRating && (
        <div className="rating-modal-overlay" onClick={() => setShowRating(false)}>
          <div className="rating-modal" onClick={(e) => e.stopPropagation()}>
            <h3>曲目评分</h3>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className={`star-btn ${star <= ratings[currentSongIndex]?.score ? 'filled' : ''}`}
                  onClick={() => handleScoreChange(star)}
                >
                  ★
                </button>
              ))}
            </div>
            <div className="score-display">
              得分: {ratings[currentSongIndex]?.score || 0} / 5
            </div>
            <div className="form-group">
              <label>反馈意见</label>
              <textarea
                value={ratings[currentSongIndex]?.feedback || ''}
                onChange={(e) => handleFeedbackChange(e.target.value)}
                placeholder="记录需要改进的地方..."
                rows={3}
              />
            </div>
            <div className="form-actions">
              <button className="cancel-btn" onClick={() => setShowRating(false)}>
                取消
              </button>
              <button className="submit-btn" onClick={handleSubmitRating}>
                提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
