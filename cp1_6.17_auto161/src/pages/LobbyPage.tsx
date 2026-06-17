import React, { useState, useEffect, useCallback } from 'react';
import {
  connectSocket,
  createRoom,
  joinRoom,
  toggleReady,
  startGame,
  onRoomCreated,
  onRoomJoined,
  onPlayerUpdate,
  onGameStart,
  onError,
  PlayerInfo,
} from '../socket';

type LobbyView = 'home' | 'lobby';

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.12)',
  borderRadius: '16px',
  padding: '32px',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.2)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
  maxWidth: '520px',
  width: '90%',
  animation: 'fadeIn 0.6s ease',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '10px',
  border: '2px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.08)',
  color: '#FFFFFF',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  boxSizing: 'border-box',
};

const btnBase: React.CSSProperties = {
  padding: '10px 24px',
  borderRadius: '10px',
  border: 'none',
  fontSize: '15px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'transform 0.1s, filter 0.2s',
};

export default function LobbyPage({ onGameStart: onGameStartProp }: { onGameStart: (roomId: string, playerId: string) => void }) {
  const [view, setView] = useState<LobbyView>('home');
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const [currentRoomId, setCurrentRoomId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    connectSocket();

    const unsub1 = onRoomCreated((data) => {
      setCurrentRoomId(data.roomId);
      setPlayerId(data.playerId);
      setIsOwner(true);
      setView('lobby');
      navigator.clipboard.writeText(data.roomId).catch(() => {});
    });

    const unsub2 = onRoomJoined((data) => {
      setCurrentRoomId(data.roomId);
      setPlayerId(data.playerId);
      setIsOwner(false);
      setView('lobby');
      setPlayers(data.players);
    });

    const unsub3 = onPlayerUpdate((plist) => {
      setPlayers(plist);
    });

    const unsub4 = onGameStart(() => {
      onGameStartProp(currentRoomId, playerId);
    });

    const unsub5 = onError((data) => {
      setErrorMsg(data.message);
      setTimeout(() => setErrorMsg(''), 3000);
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, [currentRoomId, playerId, onGameStartProp]);

  const handleCreate = useCallback(() => {
    if (!nickname.trim()) {
      setErrorMsg('请输入昵称');
      setTimeout(() => setErrorMsg(''), 2000);
      return;
    }
    createRoom(nickname.trim());
  }, [nickname]);

  const handleJoin = useCallback(() => {
    if (!nickname.trim()) {
      setErrorMsg('请输入昵称');
      setTimeout(() => setErrorMsg(''), 2000);
      return;
    }
    if (!roomId.trim()) {
      setErrorMsg('请输入房间码');
      setTimeout(() => setErrorMsg(''), 2000);
      return;
    }
    joinRoom(roomId.trim(), nickname.trim());
  }, [nickname, roomId]);

  const handleToggleReady = useCallback(() => {
    toggleReady();
  }, []);

  const handleStartGame = useCallback(() => {
    startGame();
  }, []);

  const readyCount = players.filter(p => p.isReady).length;
  const canStart = isOwner && readyCount >= 2;
  const currentPlayer = players.find(p => p.id === playerId);
  const isReady = currentPlayer?.isReady ?? false;

  if (view === 'lobby') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1A252C, #2C3E50)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'Noto Sans SC', sans-serif",
      }}>
        <div style={{ ...cardStyle, maxWidth: '440px' }}>
          <h2 style={{ color: '#FFFFFF', textAlign: 'center', margin: '0 0 8px 0', fontSize: '22px' }}>等待室</h2>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ color: '#BDC3C7', fontSize: '13px' }}>房间码: </span>
            <span style={{ color: '#2ECC71', fontSize: '20px', fontWeight: 700, letterSpacing: '3px' }}>{currentRoomId}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {players.map((p, i) => (
              <div key={p.id} className="slide-in-item" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.06)',
                animationDelay: `${i * 0.08}s`,
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6'][i % 5],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: 700,
                  position: 'relative',
                }}>
                  {p.nickname.charAt(0).toUpperCase()}
                  {p.isReady && (
                    <span style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      background: '#27AE60',
                      color: '#FFFFFF',
                      borderRadius: '50%',
                      width: '14px',
                      height: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: 900,
                    }}>✓</span>
                  )}
                </div>
                <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 600 }}>{p.nickname}</span>
                {p.id === playerId && <span style={{ color: '#8E44AD', fontSize: '11px', marginLeft: 'auto' }}>你</span>}
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', color: '#BDC3C7', fontSize: '13px', marginBottom: '16px' }}>
            已准备 {readyCount}/{players.length}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {!isOwner && (
              <button
                onClick={handleToggleReady}
                style={{
                  ...btnBase,
                  flex: 1,
                  background: isReady ? '#E74C3C' : '#2ECC71',
                  color: '#FFFFFF',
                }}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
                onMouseUp={e => (e.currentTarget.style.transform = '')}
                onMouseLeave={e => (e.currentTarget.style.transform = '')}
              >
                {isReady ? '取消准备' : '准备'}
              </button>
            )}
            {isOwner && (
              <button
                onClick={handleStartGame}
                disabled={!canStart}
                style={{
                  ...btnBase,
                  flex: 1,
                  background: canStart ? '#E67E22' : '#95A5A6',
                  color: '#FFFFFF',
                  cursor: canStart ? 'pointer' : 'not-allowed',
                  opacity: canStart ? 1 : 0.7,
                }}
                onMouseDown={e => canStart && (e.currentTarget.style.transform = 'scale(0.95)')}
                onMouseUp={e => (e.currentTarget.style.transform = '')}
                onMouseLeave={e => (e.currentTarget.style.transform = '')}
                onMouseEnter={e => canStart && (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseOut={e => (e.currentTarget.style.filter = '')}
              >
                {canStart ? '开始游戏' : `等待玩家准备 (${readyCount}/2)`}
              </button>
            )}
          </div>

          {errorMsg && (
            <div style={{ color: '#E74C3C', textAlign: 'center', marginTop: '12px', fontSize: '13px' }}>
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1A252C, #2C3E50)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Noto Sans SC', sans-serif",
    }}>
      <div style={cardStyle}>
        <h1 style={{ color: '#FFFFFF', textAlign: 'center', margin: '0 0 24px 0', fontSize: '28px', fontWeight: 900 }}>
          ✨ 灵光一现
        </h1>
        <p style={{ color: '#BDC3C7', textAlign: 'center', margin: '0 0 28px 0', fontSize: '14px' }}>
          多人实时猜词游戏
        </p>

        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
            <h3 style={{ color: '#FFFFFF', margin: '0 0 4px 0', fontSize: '16px' }}>创建房间</h3>
            <input
              type="text"
              placeholder="输入你的昵称"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#2ECC71'; e.currentTarget.style.boxShadow = '0 0 8px rgba(46,204,113,0.3)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            <button
              onClick={handleCreate}
              style={{
                ...btnBase,
                background: '#2ECC71',
                color: '#FFFFFF',
              }}
              onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
              onMouseLeave={e => (e.currentTarget.style.filter = '')}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={e => (e.currentTarget.style.transform = '')}
            >
              创建房间
            </button>
          </div>

          <div style={{ width: '1px', background: 'rgba(255,255,255,0.15)' }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
            <h3 style={{ color: '#FFFFFF', margin: '0 0 4px 0', fontSize: '16px' }}>加入房间</h3>
            <input
              type="text"
              placeholder="输入你的昵称"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#8E44AD'; e.currentTarget.style.boxShadow = '0 0 8px rgba(142,68,173,0.3)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            <input
              type="text"
              placeholder="输入房间码"
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#8E44AD'; e.currentTarget.style.boxShadow = '0 0 8px rgba(142,68,173,0.3)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            <button
              onClick={handleJoin}
              style={{
                ...btnBase,
                background: '#8E44AD',
                color: '#FFFFFF',
              }}
              onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
              onMouseLeave={e => (e.currentTarget.style.filter = '')}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={e => (e.currentTarget.style.transform = '')}
            >
              加入房间
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={{ color: '#E74C3C', textAlign: 'center', marginTop: '12px', fontSize: '13px' }}>
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}
