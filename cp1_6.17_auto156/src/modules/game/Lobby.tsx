import React, { useState } from 'react';
import { Player } from '../../types';

interface LobbyProps {
  players: Player[];
  roomCode: string;
  isHost: boolean;
  onStartGame: () => void;
  onCopyRoomCode: () => void;
}

const Lobby: React.FC<LobbyProps> = ({
  players,
  roomCode,
  isHost,
  onStartGame,
  onCopyRoomCode,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopyRoomCode();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <h1 className="text-5xl md:text-6xl font-black mb-4 neon-text tracking-wider">
          绕口令擂台
        </h1>
        <p className="text-lg md:text-xl" style={{ color: '#B0A8C0' }}>
          多人实时语音竞技 · 看看谁的嘴皮子最溜 🎤
        </p>
      </div>

      <div className="card p-6 md:p-8 w-full max-w-2xl mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-sm mb-2" style={{ color: '#B0A8C0' }}>
              房间号
            </p>
            <div className="flex items-center gap-3">
              <span
                className="text-3xl md:text-4xl font-black tracking-widest"
                style={{
                  color: '#00D4FF',
                  textShadow: '0 0 20px rgba(0, 212, 255, 0.6)',
                  fontFamily: 'Orbitron, monospace',
                }}
              >
                {roomCode}
              </span>
              <button
                onClick={handleCopy}
                className="btn btn-secondary text-sm"
                style={{
                  borderColor: copied ? '#00FF88' : 'rgba(0, 212, 255, 0.5)',
                  color: copied ? '#00FF88' : 'white',
                }}
              >
                {copied ? '✓ 已复制' : '📋 复制'}
              </button>
            </div>
          </div>
          <div className="text-center md:text-right">
            <p className="text-sm mb-2" style={{ color: '#B0A8C0' }}>
              玩家
            </p>
            <p className="text-2xl font-bold">
              <span style={{ color: '#FF007F' }}>{players.length}</span>
              <span style={{ color: '#6B6B80' }}> / 8</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
          {players.map((player) => (
            <div
              key={player.id}
              className="flex flex-col items-center"
              style={{
                animation: 'slideIn 0.4s ease-out',
              }}
            >
              <div
                className="relative mb-2 rounded-full flex items-center justify-center text-3xl md:text-5xl transition-all duration-300"
                style={{
                  width: 'clamp(60px, 12vw, 80px)',
                  height: 'clamp(60px, 12vw, 80px)',
                  background: player.avatar_bg,
                  border: `3px solid ${
                    player.is_host ? '#FFD700' : 'rgba(0, 212, 255, 0.3)'
                  }`,
                  boxShadow: player.is_host
                    ? '0 0 20px rgba(255, 215, 0, 0.5)'
                    : '0 0 15px rgba(0, 212, 255, 0.2)',
                  transform: player.is_host ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                {player.avatar}
                {player.is_host && (
                  <span
                    className="absolute -top-2 -right-1 text-xl"
                    style={{ animation: 'crownGlow 2s ease-in-out infinite' }}
                  >
                    👑
                  </span>
                )}
              </div>
              <p
                className="text-center font-semibold truncate w-full text-sm md:text-base"
                style={{ color: player.is_host ? '#FFD700' : '#FFFFFF' }}
              >
                {player.name}
              </p>
              {player.is_host && (
                <p className="text-xs mt-1" style={{ color: '#FFD700' }}>
                  房主
                </p>
              )}
            </div>
          ))}
          {Array.from({ length: Math.max(0, 4 - (players.length % 4 === 0 ? 4 : players.length % 4)) })
            .slice(0, Math.max(0, 8 - players.length))
            .map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="flex flex-col items-center"
              >
                <div
                  className="mb-2 rounded-full flex items-center justify-center text-2xl"
                  style={{
                    width: 'clamp(60px, 12vw, 80px)',
                    height: 'clamp(60px, 12vw, 80px)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '2px dashed rgba(107, 107, 128, 0.4)',
                    color: '#6B6B80',
                  }}
                >
                  +
                </div>
                <p className="text-xs" style={{ color: '#6B6B80' }}>
                  等待中
                </p>
              </div>
            ))}
        </div>
      </div>

      {isHost ? (
        <button
          onClick={onStartGame}
          disabled={players.length < 2}
          className="btn btn-primary text-lg md:text-xl px-12 py-4"
          style={{
            minWidth: '240px',
            animation: 'breathe 2s ease-in-out infinite',
          }}
        >
          🚀 开始游戏
        </button>
      ) : (
        <div className="card px-8 py-4">
          <p style={{ color: '#B0A8C0' }}>
            等待房主开始游戏...
          </p>
        </div>
      )}

      {players.length < 2 && (
        <p className="mt-4 text-sm" style={{ color: '#FF3366' }}>
          至少需要 2 名玩家才能开始游戏
        </p>
      )}
    </div>
  );
};

export default Lobby;
