import React, { useState, useEffect, useCallback, useRef } from 'react';

interface RoomInfo {
  id: string;
  name: string;
  code: string;
  playerCount: number;
  status: 'waiting' | 'playing';
}

interface RoomManagerProps {
  ws: WebSocket | null;
  onGameStart: (roomId: string, playerId: string, players: { id: string; name: string }[]) => void;
}

const RoomManager: React.FC<RoomManagerProps> = ({ ws, onGameStart }) => {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [createdRoom, setCreatedRoom] = useState<RoomInfo | null>(null);
  const [error, setError] = useState('');
  const [joinFocused, setJoinFocused] = useState(false);
  const [slideInRoom, setSlideInRoom] = useState<string | null>(null);
  const playerIdRef = useRef(`player-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case 'room_list':
          setRooms(msg.rooms);
          break;
        case 'room_created':
          setCreatedRoom(msg.room);
          setSlideInRoom(msg.room.id);
          setTimeout(() => setSlideInRoom(null), 300);
          break;
        case 'room_joined':
          break;
        case 'game_start':
          onGameStart(msg.roomId, playerIdRef.current, msg.players);
          break;
        case 'join_error':
          setError(msg.message);
          setTimeout(() => setError(''), 3000);
          break;
        case 'player_left':
          if (createdRoom && msg.roomId === createdRoom.id) {
            setCreatedRoom({ ...createdRoom, playerCount: msg.playerCount, status: 'waiting' as const });
          }
          break;
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, createdRoom, onGameStart]);

  const handleCreateRoom = useCallback(() => {
    if (!ws || !roomName.trim() || !playerName.trim()) return;
    ws.send(
      JSON.stringify({
        type: 'create_room',
        roomName: roomName.trim(),
        playerName: playerName.trim(),
        playerId: playerIdRef.current,
      })
    );
    setRoomName('');
  }, [ws, roomName, playerName]);

  const handleJoinRoom = useCallback(() => {
    if (!ws || !joinCode.trim() || !playerName.trim()) return;
    setError('');
    ws.send(
      JSON.stringify({
        type: 'join_room',
        roomCode: joinCode.trim().toUpperCase(),
        playerName: playerName.trim(),
        playerId: playerIdRef.current,
      })
    );
    setJoinCode('');
  }, [ws, joinCode, playerName]);

  if (createdRoom) {
    return (
      <div style={styles.waitingContainer}>
        <div style={styles.waitingCard}>
          <div style={styles.waitingTitle}>房间已创建</div>
          <div style={styles.roomCodeLabel}>房间码</div>
          <div style={styles.roomCodeDisplay}>
            {createdRoom.code.split('').map((char, i) => (
              <span key={i} style={styles.codeChar}>{char}</span>
            ))}
          </div>
          <div style={styles.waitingInfo}>房间名: {createdRoom.name}</div>
          <div style={styles.waitingDots}>
            <span className="waiting-dot" style={{ ...styles.dot, animationDelay: '0s' }}>●</span>
            <span className="waiting-dot" style={{ ...styles.dot, animationDelay: '0.3s' }}>●</span>
            <span className="waiting-dot" style={{ ...styles.dot, animationDelay: '0.6s' }}>●</span>
          </div>
          <div style={styles.waitingText}>等待对手加入...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>⚔️ 卡牌对战 ⚔️</div>

      <div style={styles.nameSection}>
        <label style={styles.label}>你的名称</label>
        <input
          style={styles.input}
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="输入你的名称"
          maxLength={12}
        />
      </div>

      <div style={styles.panels}>
        <div style={styles.panel}>
          <div style={styles.panelTitle}>创建房间</div>
          <input
            style={styles.input}
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="输入房间名"
            maxLength={20}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
          />
          <button
            style={{
              ...styles.button,
              ...styles.createButton,
              opacity: !roomName.trim() || !playerName.trim() ? 0.5 : 1,
            }}
            onClick={handleCreateRoom}
            disabled={!roomName.trim() || !playerName.trim()}
          >
            创建房间
          </button>
        </div>

        <div style={styles.divider} />

        <div style={styles.panel}>
          <div style={styles.panelTitle}>加入房间</div>
          <input
            style={{
              ...styles.input,
              borderColor: joinFocused ? '#ffd700' : '#3a3a5c',
              transition: 'border-color 0.3s ease',
            }}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onFocus={() => setJoinFocused(true)}
            onBlur={() => setJoinFocused(false)}
            placeholder="输入6位房间码"
            maxLength={6}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
          />
          <button
            style={{
              ...styles.button,
              ...styles.joinButton,
              opacity: !joinCode.trim() || !playerName.trim() ? 0.5 : 1,
            }}
            onClick={handleJoinRoom}
            disabled={!joinCode.trim() || !playerName.trim()}
          >
            加入房间
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.roomListSection}>
        <div style={styles.roomListTitle}>可用房间</div>
        <div style={styles.roomList}>
          {rooms.length === 0 ? (
            <div style={styles.emptyRooms}>暂无可用房间</div>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                style={{
                  ...styles.roomCard,
                  transform: slideInRoom === room.id ? 'translateX(0)' : 'translateX(0)',
                  animation: slideInRoom === room.id ? 'slideIn 0.3s ease-out' : 'none',
                }}
              >
                <div style={styles.roomCardName}>{room.name}</div>
                <div style={styles.roomCardInfo}>
                  <span>{room.playerCount}/2</span>
                  <span style={{
                    ...styles.roomStatus,
                    color: room.status === 'waiting' ? '#4caf50' : '#ff9800',
                  }}>
                    {room.status === 'waiting' ? '等待中' : '对战中'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '40px 20px',
    color: '#e0e0e0',
  },
  title: {
    fontSize: '48px',
    fontWeight: 'bold',
    marginBottom: '40px',
    textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
  },
  nameSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '30px',
    width: '300px',
  },
  label: {
    fontSize: '14px',
    marginBottom: '8px',
    color: '#aaa',
    alignSelf: 'flex-start',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '2px solid #3a3a5c',
    background: 'rgba(255,255,255,0.05)',
    color: '#e0e0e0',
    fontSize: '16px',
    outline: 'none',
  },
  panels: {
    display: 'flex',
    gap: '30px',
    marginBottom: '20px',
    alignItems: 'stretch',
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '24px',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    width: '260px',
  },
  panelTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    marginBottom: '4px',
  },
  divider: {
    width: '1px',
    background: 'rgba(255,255,255,0.1)',
    alignSelf: 'stretch',
  },
  button: {
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  createButton: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#fff',
  },
  joinButton: {
    background: 'linear-gradient(135deg, #f093fb, #f5576c)',
    color: '#fff',
  },
  error: {
    color: '#ff5252',
    fontSize: '14px',
    marginTop: '12px',
    padding: '8px 16px',
    background: 'rgba(255,82,82,0.1)',
    borderRadius: '8px',
  },
  roomListSection: {
    marginTop: '30px',
    width: '100%',
    maxWidth: '600px',
  },
  roomListTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '12px',
    textAlign: 'center' as const,
  },
  roomList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  emptyRooms: {
    textAlign: 'center' as const,
    color: '#666',
    gridColumn: '1 / -1',
    padding: '20px',
  },
  roomCard: {
    padding: '16px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.1)',
    cursor: 'default',
  },
  roomCardName: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  roomCardInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#999',
  },
  roomStatus: {
    fontWeight: 'bold',
  },
  waitingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    color: '#e0e0e0',
  },
  waitingCard: {
    padding: '48px',
    borderRadius: '24px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    textAlign: 'center' as const,
  },
  waitingTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '24px',
  },
  roomCodeLabel: {
    fontSize: '14px',
    color: '#888',
    marginBottom: '12px',
  },
  roomCodeDisplay: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  codeChar: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '56px',
    background: 'rgba(255,215,0,0.15)',
    border: '2px solid rgba(255,215,0,0.4)',
    borderRadius: '8px',
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#ffd700',
  },
  waitingInfo: {
    fontSize: '16px',
    color: '#aaa',
    marginBottom: '20px',
  },
  waitingDots: {
    fontSize: '24px',
    marginBottom: '12px',
  },
  dot: {
    animation: 'pulse 1.2s infinite',
    color: '#ffd700',
  },
  waitingText: {
    fontSize: '16px',
    color: '#888',
  },
};

export default RoomManager;
