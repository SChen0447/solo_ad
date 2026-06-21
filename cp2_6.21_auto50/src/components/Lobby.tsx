import React, { useState, useEffect } from 'react';
import { emit, on } from '../utils/socket';
import { RoomState, PublicRoom, GameType, Player } from '../types';

const gameTypeLabels: Record<GameType, string> = {
  'word-guess': '猜词',
  'spy': '谁是卧底',
  'draw-relay': '画图接力',
};

function getInitials(name: string): string {
  return name.charAt(0).toUpperCase();
}

function CrownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="crown-icon">
      <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5Z" fill="#FFD700" stroke="#FFA500" strokeWidth="1.5"/>
      <path d="M3 20H21C21 20 21 16 12 16C3 16 3 20 3 20Z" fill="#FFD700" stroke="#FFA500" strokeWidth="1.5"/>
    </svg>
  );
}

interface LobbyProps {
  playerId: string | null;
  roomState: RoomState | null;
  onJoined: (roomId: string, playerId: string, inviteCode: string) => void;
  onKicked: () => void;
}

const Lobby: React.FC<LobbyProps> = ({ playerId, roomState, onJoined, onKicked }) => {
  const [playerName, setPlayerName] = useState('');
  const [createGameType, setCreateGameType] = useState<GameType>('word-guess');
  const [joinInviteCode, setJoinInviteCode] = useState('');
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [error, setError] = useState('');
  const [showPlayerPanel, setShowPlayerPanel] = useState(false);
  const [animatingPlayers, setAnimatingPlayers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/rooms')
      .then((res) => res.json())
      .then((data) => setPublicRooms(data));

    const offJoined = on<{ roomId: string; playerId: string; inviteCode: string }>('room:joined', (data) => {
      onJoined(data.roomId, data.playerId, data.inviteCode);
      setShowPlayerPanel(true);
    });

    const offError = on<{ message: string }>('error', (data) => {
      setError(data.message);
      setTimeout(() => setError(''), 3000);
    });

    const offKicked = on('room:kicked', () => {
      onKicked();
      setShowPlayerPanel(false);
    });

    return () => {
      offJoined();
      offError();
      offKicked();
    };
  }, [onJoined, onKicked]);

  useEffect(() => {
    if (roomState && roomState.players.length > 0) {
      setShowPlayerPanel(true);
    }
  }, [roomState]);

  useEffect(() => {
    if (roomState) {
      const playerIds = new Set(roomState.players.map(p => p.id));
      roomState.players.forEach(p => {
        setAnimatingPlayers(prev => {
          const next = new Set(prev);
          next.add(p.id);
          return next;
        });
        setTimeout(() => {
          setAnimatingPlayers(prev => {
            const next = new Set(prev);
            next.delete(p.id);
            return next;
          });
        }, 300);
      });
    }
  }, [roomState?.players.length]);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError('请输入你的名字');
      return;
    }
    emit('room:create', { name: playerName.trim(), gameType: createGameType });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError('请输入你的名字');
      return;
    }
    if (!joinInviteCode.trim()) {
      setError('请输入邀请码');
      return;
    }
    emit('room:join', { name: playerName.trim(), inviteCode: joinInviteCode.trim() });
  };

  const handleKickPlayer = (targetPlayerId: string) => {
    emit('room:kick', { playerId: targetPlayerId });
  };

  const handleTransferHost = (targetPlayerId: string) => {
    emit('room:transfer-host', { playerId: targetPlayerId });
  };

  const handleLeaveRoom = () => {
    emit('room:leave');
    onKicked();
    setShowPlayerPanel(false);
  };

  const isHost = roomState?.players.find(p => p.id === playerId)?.isHost ?? false;

  return (
    <div className="lobby-container">
      <style>{`
        .lobby-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }
        @media (min-width: 768px) and (max-width: 1024px) {
          .lobby-container {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (min-width: 1024px) {
          .lobby-container {
            grid-template-columns: 1fr 1fr 320px;
          }
        }
        .card {
          background: #E0F2FE;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .card h2 {
          color: #1E3A5F;
          margin: 0 0 16px 0;
          font-size: 20px;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          color: #1E3A5F;
          font-weight: 500;
          margin-bottom: 8px;
        }
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #D1D5DB;
          border-radius: 12px;
          font-size: 14px;
          box-sizing: border-box;
          transition: border-color 0.2s ease;
        }
        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #6366F1;
        }
        .btn {
          width: 100%;
          padding: 12px 24px;
          background: linear-gradient(135deg, #1E3A5F 0%, #2B5A8C 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(30, 58, 95, 0.3);
        }
        .btn-secondary {
          background: linear-gradient(135deg, #6B7280 0%, #4B5563 100%);
        }
        .btn-secondary:hover {
          box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
        }
        .btn-danger {
          background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
          padding: 6px 12px;
          font-size: 12px;
          width: auto;
        }
        .btn-danger:hover {
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }
        .room-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .room-item {
          background: white;
          padding: 16px;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .room-info h3 {
          margin: 0 0 4px 0;
          color: #1E3A5F;
          font-size: 16px;
        }
        .room-info p {
          margin: 0;
          color: #6B7280;
          font-size: 13px;
        }
        .room-badge {
          background: #10B981;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }
        .room-badge.waiting {
          background: #F59E0B;
        }
        .error-message {
          background: #FEE2E2;
          color: #DC2626;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
        }
        .player-panel {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-out, padding 0.3s ease-out, opacity 0.3s ease-out;
          opacity: 0;
        }
        .player-panel.open {
          max-height: 800px;
          opacity: 1;
        }
        .player-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .player-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: white;
          border-radius: 12px;
          transform: translateX(100%);
          opacity: 0;
          transition: transform 0.3s ease-out, opacity 0.3s ease-out;
        }
        .player-item.animate-in {
          transform: translateX(0);
          opacity: 1;
        }
        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #FFDAB9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1E3A5F;
          font-weight: 600;
          flex-shrink: 0;
          position: relative;
        }
        .crown-icon {
          position: absolute;
          top: -6px;
          right: -6px;
        }
        .player-info {
          flex: 1;
          min-width: 0;
        }
        .player-name {
          color: #1E3A5F;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .player-score {
          color: #6B7280;
          font-size: 13px;
        }
        .player-actions {
          display: flex;
          gap: 6px;
        }
        .host-badge {
          background: #FEF3C7;
          color: #D97706;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }
        .room-header {
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid #BFDBFE;
        }
        .invite-code {
          background: #1E3A5F;
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-family: 'Courier New', monospace;
          font-size: 18px;
          font-weight: bold;
          text-align: center;
          letter-spacing: 4px;
        }
        .invite-label {
          font-size: 12px;
          color: #6B7280;
          margin-bottom: 4px;
        }
        .game-type-tag {
          display: inline-block;
          background: #DBEAFE;
          color: #1E40AF;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          margin-bottom: 8px;
        }
        .empty-state {
          text-align: center;
          color: #9CA3AF;
          padding: 32px 0;
        }
      `}</style>

      <div className="card">
        <h2>🎮 创建房间</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleCreateRoom}>
          <div className="form-group">
            <label>你的名字</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="输入你的昵称"
              disabled={!!roomState}
            />
          </div>
          <div className="form-group">
            <label>游戏类型</label>
            <select
              value={createGameType}
              onChange={(e) => setCreateGameType(e.target.value as GameType)}
              disabled={!!roomState}
            >
              {Object.entries(gameTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          {!roomState ? (
            <button type="submit" className="btn">创建房间</button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={handleLeaveRoom}>
              离开房间
            </button>
          )}
        </form>
      </div>

      <div className="card">
        <h2>🚪 加入房间</h2>
        <form onSubmit={handleJoinRoom}>
          <div className="form-group">
            <label>你的名字</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="输入你的昵称"
              disabled={!!roomState}
            />
          </div>
          <div className="form-group">
            <label>邀请码（6位数字）</label>
            <input
              type="text"
              value={joinInviteCode}
              onChange={(e) => setJoinInviteCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              disabled={!!roomState}
            />
          </div>
          {!roomState && (
            <button type="submit" className="btn">加入房间</button>
          )}
        </form>

        <div style={{ marginTop: 32 }}>
          <h2>📋 公开房间</h2>
          <div className="room-list">
            {publicRooms.length === 0 ? (
              <div className="empty-state">暂无公开房间</div>
            ) : (
              publicRooms.map((room) => (
                <div key={room.id} className="room-item">
                  <div className="room-info">
                    <h3>{gameTypeLabels[room.gameType]}</h3>
                    <p>房间号: {room.inviteCode} · {room.playerCount}/8 人</p>
                  </div>
                  <span className={`room-badge ${room.gameStatus}`}>
                    {room.gameStatus === 'waiting' ? '等待中' : room.gameStatus === 'playing' ? '游戏中' : '已结束'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={`player-panel ${showPlayerPanel ? 'open' : ''}`}>
        <div className="card">
          {roomState ? (
            <>
              <div className="room-header">
                <span className="game-type-tag">{gameTypeLabels[roomState.gameType]}</span>
                <div className="invite-label">房间邀请码</div>
                <div className="invite-code">{roomState.inviteCode}</div>
              </div>
              <h2>👥 玩家列表 ({roomState.players.length}/8)</h2>
              <div className="player-list">
                {roomState.players.map((player: Player) => (
                  <div
                    key={player.id}
                    className={`player-item ${animatingPlayers.has(player.id) ? 'animate-in' : ''}`}
                  >
                    <div className="avatar">
                      {getInitials(player.name)}
                      {player.isHost && <CrownIcon />}
                    </div>
                    <div className="player-info">
                      <div className="player-name">
                        {player.name}
                        {player.isHost && <span className="host-badge" style={{ marginLeft: 8 }}>房主</span>}
                      </div>
                      <div className="player-score">积分: {player.score}</div>
                    </div>
                    {isHost && !player.isHost && (
                      <div className="player-actions">
                        <button
                          className="btn btn-danger"
                          onClick={() => handleTransferHost(player.id)}
                          title="移交房主"
                        >
                          移交
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleKickPlayer(player.id)}
                          title="踢出房间"
                        >
                          踢出
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">加入房间后显示玩家列表</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lobby;
