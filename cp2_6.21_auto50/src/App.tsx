import React, { useState, useEffect, useCallback } from 'react';
import { on } from './utils/socket';
import { RoomState } from './types';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import Scoreboard from './components/Scoreboard';

type View = 'lobby' | 'game' | 'scoreboard';

const App: React.FC = () => {
  const [view, setView] = useState<View>('lobby');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);

  const handleJoined = useCallback((joinedRoomId: string, joinedPlayerId: string, _inviteCode: string) => {
    setRoomId(joinedRoomId);
    setPlayerId(joinedPlayerId);
  }, []);

  const handleKicked = useCallback(() => {
    setRoomId(null);
    setPlayerId(null);
    setRoomState(null);
    setView('lobby');
  }, []);

  useEffect(() => {
    const offRoomState = on<RoomState>('room:state', (state) => {
      setRoomState(state);
    });

    return () => {
      offRoomState();
    };
  }, []);

  return (
    <div className="app-container">
      <style>{`
        .app-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #F8FAFC 0%, #E0F2FE 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .app-header {
          background: linear-gradient(135deg, #1E3A5F 0%, #2B5A8C 100%);
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .app-title {
          color: white;
          font-size: 24px;
          font-weight: bold;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .app-title span {
          font-size: 28px;
        }
        .nav-tabs {
          display: flex;
          gap: 8px;
        }
        .nav-tab {
          padding: 10px 20px;
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.8);
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .nav-tab:hover:not(:disabled) {
          background: rgba(255,255,255,0.2);
          color: white;
        }
        .nav-tab.active {
          background: white;
          color: #1E3A5F;
        }
        .nav-tab:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .room-indicator {
          color: rgba(255,255,255,0.9);
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .room-code {
          background: rgba(255,255,255,0.2);
          padding: 6px 12px;
          border-radius: 6px;
          font-family: 'Courier New', monospace;
          font-weight: bold;
          letter-spacing: 2px;
        }
        .leave-btn {
          padding: 8px 16px;
          background: rgba(239, 68, 68, 0.8);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s ease;
          font-family: inherit;
        }
        .leave-btn:hover {
          background: #EF4444;
        }
        .app-main {
          min-height: calc(100vh - 80px);
        }
        @media (max-width: 768px) {
          .app-header {
            flex-direction: column;
            gap: 12px;
          }
          .app-title {
            font-size: 20px;
          }
          .nav-tab {
            padding: 8px 14px;
            font-size: 13px;
          }
        }
      `}</style>

      <header className="app-header">
        <h1 className="app-title">
          <span>🎲</span>
          虚拟桌游主持人
        </h1>

        <nav className="nav-tabs">
          <button
            className={`nav-tab ${view === 'lobby' ? 'active' : ''}`}
            onClick={() => setView('lobby')}
          >
            🏠 大厅
          </button>
          <button
            className={`nav-tab ${view === 'game' ? 'active' : ''}`}
            onClick={() => setView('game')}
            disabled={!roomState || roomState.gameStatus === 'waiting'}
          >
            🎮 游戏
          </button>
          <button
            className={`nav-tab ${view === 'scoreboard' ? 'active' : ''}`}
            onClick={() => setView('scoreboard')}
            disabled={!roomState}
          >
            📊 积分
          </button>
        </nav>

        {roomState ? (
          <div className="room-indicator">
            <span>房间:</span>
            <span className="room-code">{roomState.inviteCode}</span>
            <button className="leave-btn" onClick={handleKicked}>
              离开
            </button>
          </div>
        ) : (
          <div className="room-indicator">
            <span style={{ opacity: 0.7 }}>未加入房间</span>
          </div>
        )}
      </header>

      <main className="app-main">
        {view === 'lobby' && (
          <Lobby
            playerId={playerId}
            roomState={roomState}
            onJoined={handleJoined}
            onKicked={handleKicked}
          />
        )}
        {view === 'game' && roomState && playerId && (
          <GameRoom
            roomState={roomState}
            playerId={playerId}
          />
        )}
        {view === 'scoreboard' && roomState && (
          <Scoreboard
            roomState={roomState}
          />
        )}
        {view === 'game' && !roomState && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '60vh',
            color: '#6B7280',
            fontSize: 18,
          }}>
            请先在大厅加入或创建房间
          </div>
        )}
        {view === 'scoreboard' && !roomState && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '60vh',
            color: '#6B7280',
            fontSize: 18,
          }}>
            请先在大厅加入或创建房间
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
