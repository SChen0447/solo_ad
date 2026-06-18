import React, { useState } from 'react';
import { useAppStore } from '../store';
import { v4 as uuidv4 } from 'uuid';

const EMOJI_OPTIONS = ['🎭', '🐱', '🦊', '🐼', '🦄', '🐸', '🦉', '🐙', '🦋', '🐺', '🦁', '🐧'];
const COLOR_OPTIONS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F9CA24', '#FF9FF3', '#54A0FF', '#5F27CD', '#01A3A4', '#F368E0', '#FF9F43', '#EE5A24', '#7BED9F'];

function LobbyView() {
  const [nickname, setNickname] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🎭');
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [roomId, setRoomId] = useState('');
  const ws = useAppStore((s) => s.ws);

  const handleCreate = () => {
    if (!nickname.trim() || !ws) return;
    const userId = uuidv4();
    ws.send({
      type: 'create_room',
      payload: {
        userId,
        nickname: nickname.trim(),
        emoji: selectedEmoji,
        avatarColor: selectedColor,
      },
    });
  };

  const handleJoin = () => {
    if (!nickname.trim() || !roomId.trim() || !ws) return;
    const userId = uuidv4();
    ws.send({
      type: 'join_room',
      payload: {
        roomId: roomId.trim(),
        userId,
        nickname: nickname.trim(),
        emoji: selectedEmoji,
        avatarColor: selectedColor,
      },
    });
  };

  const glassStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(15px)',
    WebkitBackdropFilter: 'blur(15px)',
    borderRadius: 20,
    padding: 32,
    border: '1px solid rgba(255,255,255,0.1)',
    maxWidth: 440,
    width: '100%',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(0,0,0,0.3)',
    color: '#fff',
    fontSize: 15,
    outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: 24,
      padding: 16,
    }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <h1 style={{
          background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontSize: 'clamp(36px, 6vw, 56px)',
          fontWeight: 800,
          filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.3))',
          animation: 'shimmer 3s linear infinite',
        }}>
          可觅
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 16,
          marginTop: 4,
        }}>
          线上即兴戏剧工作坊
        </p>
        <style>{`
          @keyframes shimmer {
            0% { background-position: 0% center; }
            100% { background-position: 200% center; }
          }
        `}</style>
      </div>

      <div style={glassStyle}>
        <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
          你的昵称
        </label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="给自己起个名字吧"
          maxLength={12}
          style={inputStyle}
        />

        <div style={{ marginTop: 16 }}>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
            选择头像
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setSelectedEmoji(e)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: selectedEmoji === e ? '2px solid #FFD700' : '2px solid rgba(255,255,255,0.1)',
                  background: selectedEmoji === e ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)',
                  fontSize: 20,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
            选择颜色
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: selectedColor === c ? '2px solid #fff' : '2px solid transparent',
                  background: c,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedColor === c ? `0 0 12px ${c}` : 'none',
                }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={!nickname.trim()}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 12,
            border: 'none',
            background: nickname.trim()
              ? 'linear-gradient(135deg, #FFD700, #FFA500)'
              : 'rgba(255,255,255,0.1)',
            color: nickname.trim() ? '#1a1a2e' : 'rgba(255,255,255,0.3)',
            fontWeight: 700,
            fontSize: 16,
            cursor: nickname.trim() ? 'pointer' : 'not-allowed',
            marginTop: 24,
            transition: 'all 0.2s ease',
          }}
        >
          ✨ 创建新房间
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginTop: 20,
        }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>或者加入已有房间</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="输入房间号"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={handleJoin}
            disabled={!nickname.trim() || !roomId.trim()}
            style={{
              padding: '12px 20px',
              borderRadius: 10,
              border: '1px solid rgba(255,215,0,0.3)',
              background: nickname.trim() && roomId.trim()
                ? 'rgba(255,215,0,0.15)'
                : 'rgba(255,255,255,0.05)',
              color: nickname.trim() && roomId.trim()
                ? '#FFD700'
                : 'rgba(255,255,255,0.3)',
              fontWeight: 600,
              fontSize: 15,
              cursor: nickname.trim() && roomId.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
            }}
          >
            加入
          </button>
        </div>
      </div>
    </div>
  );
}

function WaitingRoom() {
  const room = useAppStore((s) => s.room);
  const currentUser = useAppStore((s) => s.currentUser);
  const ws = useAppStore((s) => s.ws);
  const connectionStatus = useAppStore((s) => s.connectionStatus);

  if (!room) return null;

  const isHost = currentUser?.id === room.hostId;

  const handleStart = () => {
    if (ws && isHost) {
      ws.send({ type: 'start_game', payload: { roomId: room.id } });
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: 20,
      padding: 16,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(15px)',
        WebkitBackdropFilter: 'blur(15px)',
        borderRadius: 20,
        padding: 32,
        border: '1px solid rgba(255,255,255,0.1)',
        maxWidth: 480,
        width: '100%',
        textAlign: 'center',
      }}>
        <h2 style={{
          color: '#FFD700',
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 4,
        }}>
          🎭 等候室
        </h2>
        <p style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 14,
          marginBottom: 20,
        }}>
          房间号: <span style={{ color: '#FFD700', fontWeight: 700, letterSpacing: 2 }}>{room.id}</span>
        </p>

        <div style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 13,
          marginBottom: 16,
        }}>
          {connectionStatus === 'connected' ? '🟢 已连接' : '🔴 连接中...'}
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'center',
          marginBottom: 24,
        }}>
          {room.users.map((user) => (
            <div
              key={user.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                animation: 'fadeInUp 0.5s ease both',
              }}
            >
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${user.avatarColor}, ${user.avatarColor}88)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                border: user.isHost ? '2px solid #FFD700' : '2px solid rgba(255,255,255,0.15)',
              }}>
                {user.emoji}
              </div>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                {user.nickname}
              </span>
              {user.isHost && (
                <span style={{ color: '#FFD700', fontSize: 10 }}>房主</span>
              )}
            </div>
          ))}
        </div>

        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 16 }}>
          {room.users.length}/{room.maxUsers} 人已加入
        </p>

        {isHost ? (
          <button
            onClick={handleStart}
            style={{
              padding: '14px 36px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              color: '#1a1a2e',
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(255,215,0,0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            🎬 开始新剧
          </button>
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            等待房主开始游戏...
          </p>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default function SceneControls() {
  const room = useAppStore((s) => s.room);

  if (!room) {
    return <LobbyView />;
  }

  if (room.phase === 'lobby') {
    return <WaitingRoom />;
  }

  return null;
}
