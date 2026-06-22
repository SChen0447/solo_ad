import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import BattleScene from './BattleScene';
import type {
  BattleState,
  BattleEvent,
  MatchStartPayload,
  MatchRecord,
  SocketClientEvents,
  SocketServerEvents,
} from '../shared/types';
import { RECONNECT_TIMEOUT } from '../shared/constants';

type ViewState = 'lobby' | 'matching' | 'battle' | 'reconnecting';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('lobby');
  const [nickname, setNickname] = useState('');
  const [socket, setSocket] = useState<Socket<SocketServerEvents, SocketClientEvents> | null>(null);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [matchStartInfo, setMatchStartInfo] = useState<MatchStartPayload | null>(null);
  const [events, setEvents] = useState<BattleEvent[]>([]);
  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [showRecords, setShowRecords] = useState(false);
  const [showReconnectBanner, setShowReconnectBanner] = useState(false);
  const [isOpponentDisconnected, setIsOpponentDisconnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const sessionInfoRef = useRef<{ roomId: string; playerId: string } | null>(null);

  useEffect(() => {
    const newSocket: Socket<SocketServerEvents, SocketClientEvents> = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('[client] connected', newSocket.id);
      if (sessionInfoRef.current && view === 'reconnecting') {
        newSocket.emit('reconnect', sessionInfoRef.current.roomId, sessionInfoRef.current.playerId);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('[client] disconnected');
      if (view === 'battle') {
        setShowReconnectBanner(true);
        setTimeout(() => setShowReconnectBanner(false), 3000);
        setView('reconnecting');
      }
    });

    newSocket.on('match-queued', () => {
      console.log('[client] match queued');
      setView('matching');
    });

    newSocket.on('match-cancelled', () => {
      setView('lobby');
    });

    newSocket.on('match-start', (payload: MatchStartPayload) => {
      console.log('[client] match started');
      sessionInfoRef.current = { roomId: payload.roomId, playerId: payload.playerId };
      localStorage.setItem('cb_session', JSON.stringify(sessionInfoRef.current));
      setMatchStartInfo(payload);
      setBattleState(payload.state);
      setEvents([]);
      setView('battle');
    });

    newSocket.on('state-update', (state: BattleState, evts: BattleEvent[]) => {
      console.log('[client] state update, turn:', state.turnNumber);
      setBattleState(state);
      if (evts && evts.length > 0) {
        setEvents((prev) => [...prev, ...evts].slice(-50));
      }
    });

    newSocket.on('records-update', (recs: MatchRecord[]) => {
      setRecords(recs);
    });

    newSocket.on('opponent-disconnected', () => {
      setIsOpponentDisconnected(true);
    });

    newSocket.on('opponent-reconnected', () => {
      setIsOpponentDisconnected(false);
    });

    newSocket.on('reconnect-success', (payload: MatchStartPayload) => {
      console.log('[client] reconnected');
      setShowReconnectBanner(false);
      setMatchStartInfo(payload);
      setBattleState(payload.state);
      setView('battle');
    });

    newSocket.on('reconnect-failed', () => {
      console.log('[client] reconnect failed');
      alert('重连超时，对战已结束');
      sessionInfoRef.current = null;
      localStorage.removeItem('cb_session');
      setView('lobby');
    });

    newSocket.on('error', (msg) => {
      console.error('[client] server error:', msg);
    });

    const saved = localStorage.getItem('cb_session');
    if (saved) {
      try {
        const info = JSON.parse(saved);
        sessionInfoRef.current = info;
        setView('reconnecting');
        setShowReconnectBanner(true);
        setTimeout(() => {
          if (newSocket.connected) {
            newSocket.emit('reconnect', info.roomId, info.playerId);
          }
        }, 500);
      } catch {}
    }

    const t = setTimeout(() => {
      newSocket.emit('get-records');
    }, 300);

    return () => {
      clearTimeout(t);
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    const interval = setInterval(() => {
      socket.emit('get-records');
    }, 10000);
    return () => clearInterval(interval);
  }, [socket]);

  const handleStartMatch = () => {
    if (!nickname.trim()) {
      alert('请输入昵称');
      return;
    }
    if (!socket) return;
    console.log('[sfx] click_start_match');
    socket.emit('start-match', nickname);
  };

  const handleCancelMatch = () => {
    if (!socket) return;
    socket.emit('cancel-match');
  };

  const handlePlayCard = (cardId: string, position: number) => {
    if (!socket) return;
    socket.emit('play-card', { cardId, position });
  };

  const handleEndTurn = () => {
    if (!socket) return;
    socket.emit('end-turn');
  };

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app-root">
      {showReconnectBanner && (
        <div className="banner banner-danger reconnect-banner">
          连接中断，尝试重连...
        </div>
      )}

      {view === 'lobby' && (
        <div className="lobby-page">
          <div className="lobby-background" />
          <div className="lobby-container">
            <h1 className="game-title">卡牌对战</h1>
            <p className="game-subtitle">实时匹配 · 回合制战斗</p>

            <div className="lobby-form">
              <label className="form-label">输入昵称</label>
              <input
                className="nickname-input"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="请输入玩家昵称"
                maxLength={12}
                onKeyDown={(e) => e.key === 'Enter' && handleStartMatch()}
              />
              <button className="btn-primary match-btn" onClick={handleStartMatch}>
                🎮 开始匹配
              </button>
              <button className="btn-secondary records-btn" onClick={() => setShowRecords(true)}>
                📜 战报
              </button>
            </div>

            <div className="element-legend">
              <div className="legend-title">元素克制关系</div>
              <div className="legend-row">
                <span style={{ color: '#ef4444' }}>🔥火</span> →
                <span style={{ color: '#22c55e' }}>🌪️风</span> →
                <span style={{ color: '#f97316' }}>🪨地</span> →
                <span style={{ color: '#3b82f6' }}>💧水</span> →
                <span style={{ color: '#ef4444' }}>🔥火</span>
              </div>
              <div className="legend-row">
                <span style={{ color: '#eab308' }}>☀️光</span> ⇄
                <span style={{ color: '#a855f7' }}>🌙暗</span>
                <span className="legend-note">（互相克制）</span>
              </div>
              <div className="legend-hint">克制时攻击+30%，被克制时-30%</div>
            </div>
          </div>
        </div>
      )}

      {view === 'matching' && (
        <div className="matching-page">
          <div className="matching-container">
            <div className="matching-pulse">
              <div className="pulse-ring" />
              <div className="pulse-ring delay-1" />
              <div className="pulse-ring delay-2" />
              <div className="matching-icon">🔍</div>
            </div>
            <div className="matching-text">等待中...</div>
            <div className="matching-nickname">玩家: {nickname}</div>
            <button className="btn-secondary cancel-match-btn" onClick={handleCancelMatch}>
              取消匹配
            </button>
          </div>
        </div>
      )}

      {(view === 'battle' || view === 'reconnecting') && battleState && matchStartInfo && (
        <BattleScene
          battleState={battleState}
          playerId={matchStartInfo.playerId}
          opponentInfo={matchStartInfo.opponent}
          onPlayCard={handlePlayCard}
          onEndTurn={handleEndTurn}
          events={events.slice(-5)}
          isOpponentDisconnected={isOpponentDisconnected}
        />
      )}

      {view === 'reconnecting' && !battleState && (
        <div className="reconnecting-page">
          <div className="reconnecting-spinner" />
          <div>正在恢复战斗...</div>
          <button className="btn-secondary" onClick={() => {
            sessionInfoRef.current = null;
            localStorage.removeItem('cb_session');
            setView('lobby');
          }}>返回大厅</button>
        </div>
      )}

      {showRecords && (
        <div className="records-modal-overlay" onClick={() => setShowRecords(false)}>
          <div className="records-modal" onClick={(e) => e.stopPropagation()}>
            <div className="records-header">
              <h2>📜 最近战报</h2>
              <button className="close-btn" onClick={() => setShowRecords(false)}>✕</button>
            </div>
            <div className="records-list">
              {records.length === 0 ? (
                <div className="records-empty">暂无对战记录</div>
              ) : (
                records.map((r, idx) => (
                  <div key={r.id} className="record-row">
                    <span className="record-index">#{records.length - idx}</span>
                    <span className={`record-name ${r.winnerName === r.player1Name ? 'winner' : ''}`}>
                      {r.player1Name}
                    </span>
                    <span className="record-vs">VS</span>
                    <span className={`record-name ${r.winnerName === r.player2Name ? 'winner' : ''}`}>
                      {r.player2Name}
                    </span>
                    <span className="record-winner">🏆 {r.winnerName}</span>
                    <span className="record-turns">回合{r.turnCount}</span>
                    <span className="record-duration">{formatDuration(r.durationMs)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
