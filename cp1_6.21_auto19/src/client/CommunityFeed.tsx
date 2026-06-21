import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { CookingSession } from './types';
import './CommunityFeed.css';

interface CommunityFeedProps {
  socket: any;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}分${secs}秒`;
}

export default function CommunityFeed({ socket }: CommunityFeedProps) {
  const [sessions, setSessions] = useState<CookingSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<CookingSession | null>(null);
  const [isWatching, setIsWatching] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.emit('get_active_sessions');

    socket.on('active_sessions', (data: CookingSession[]) => {
      setSessions(data);
    });

    socket.on('session_started', (session: CookingSession) => {
      setSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== session.id);
        return [session, ...filtered].slice(0, 20);
      });
    });

    socket.on('session_ended', (data: { sessionId: string }) => {
      setSessions((prev) => prev.filter((s) => s.id !== data.sessionId));
      if (selectedSession?.id === data.sessionId) {
        setSelectedSession(null);
        setIsWatching(false);
      }
    });

    socket.on('timer_tick', (data: { sessionId: string; remainingTime: number }) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === data.sessionId ? { ...s, remainingTime: data.remainingTime } : s
        )
      );
      if (selectedSession?.id === data.sessionId) {
        setSelectedSession((prev) =>
          prev ? { ...prev, remainingTime: data.remainingTime } : null
        );
      }
    });

    socket.on('timer_finished', (data: any) => {
      if (isWatching && selectedSession) {
        playFinishSound();
      }
    });

    return () => {
      socket.off('active_sessions');
      socket.off('session_started');
      socket.off('session_ended');
      socket.off('timer_tick');
      socket.off('timer_finished');
    };
  }, [socket, selectedSession, isWatching]);

  const playFinishSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      // ignore
    }
  };

  const joinWatch = (session: CookingSession) => {
    if (!socket) return;
    socket.emit('join_session', { sessionId: session.id });
    setSelectedSession(session);
    setIsWatching(true);
  };

  const leaveWatch = () => {
    if (!socket || !selectedSession) return;
    socket.emit('leave_session', { sessionId: selectedSession.id });
    setSelectedSession(null);
    setIsWatching(false);
  };

  const progress = selectedSession
    ? ((selectedSession.duration - selectedSession.remainingTime) / selectedSession.duration) * 100
    : 0;

  return (
    <div className="community-feed">
      <h3 className="feed-title">🔥 社区动态</h3>
      <p className="feed-subtitle">看看大家正在做什么</p>

      {isWatching && selectedSession && (
        <div className="watching-panel">
          <div className="watching-header">
            <span className="watching-badge">👀 观看中</span>
            <button className="btn-leave" onClick={leaveWatch}>
              退出观看
            </button>
          </div>
          <Link to={`/recipe/${selectedSession.recipeId}`} className="watching-recipe">
            {selectedSession.recipeTitle}
          </Link>
          <div className="watching-step">{selectedSession.stepName}</div>
          <div className="watching-time">
            剩余 {formatTime(selectedSession.remainingTime)}
          </div>
          <div className="watching-progress">
            <div
              className="watching-progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="watching-user">
            by {selectedSession.userName}
          </div>
        </div>
      )}

      <div className="sessions-list">
        {sessions.length === 0 ? (
          <div className="no-sessions">
            <p>🍽️ 暂时没有人在烹饪</p>
            <p className="no-sessions-sub">成为第一个开始烹饪的人吧!</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className={`session-card ${selectedSession?.id === session.id ? 'active' : ''}`}
            >
              <div className="session-user">
                <div className="user-avatar">{session.userName.charAt(0)}</div>
                <div className="user-info">
                  <div className="user-name">{session.userName}</div>
                  <div className="session-action">正在制作</div>
                </div>
              </div>
              <div className="session-recipe">{session.recipeTitle}</div>
              <div className="session-step">
                <span className="step-label">步骤:</span> {session.stepName}
              </div>
              <div className="session-time">
                ⏱ 剩余 {formatTime(session.remainingTime)}
              </div>
              <div className="session-progress">
                <div
                  className="session-progress-bar"
                  style={{
                    width: `${((session.duration - session.remainingTime) / session.duration) * 100}%`,
                  }}
                />
              </div>
              {!isWatching || selectedSession?.id !== session.id ? (
                <button
                  className="btn-watch"
                  onClick={() => joinWatch(session)}
                >
                  👁️ 加入观看
                </button>
              ) : (
                <div className="watching-indicator">观看中</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
