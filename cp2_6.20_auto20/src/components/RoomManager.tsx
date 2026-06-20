import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface Room {
  id: string;
  name: string;
  code: string;
  playerCount: number;
  status: string;
}

interface RoomManagerProps {
  ws: WebSocket | null;
  onEnterGame: (roomId: string, roomCode: string, playerId: string, playerName: string, roomName: string) => void;
}

const RoomManager: React.FC<RoomManagerProps> = ({ ws, onEnterGame }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingRoomCode, setWaitingRoomCode] = useState('');
  const [waitingRoomName, setWaitingRoomName] = useState('');
  const [error, setError] = useState('');
  const [joinInputFocused, setJoinInputFocused] = useState(false);
  const navigate = useNavigate();
  const localWsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (ws) {
      localWsRef.current = ws;
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'room_list':
          case 'room_list_update':
            setRooms(message.rooms || []);
            break;
          case 'room_created':
            setIsWaiting(true);
            setWaitingRoomCode(message.roomCode);
            setWaitingRoomName(message.roomName);
            localStorage.setItem('playerId', message.playerId);
            localStorage.setItem('playerName', message.playerName);
            localStorage.setItem('roomId', message.roomId);
            localStorage.setItem('roomCode', message.roomCode);
            localStorage.setItem('roomName', message.roomName);
            break;
          case 'room_joined':
            localStorage.setItem('playerId', message.playerId);
            localStorage.setItem('playerName', message.playerName);
            localStorage.setItem('roomId', message.roomId);
            localStorage.setItem('roomCode', message.roomCode);
            localStorage.setItem('roomName', message.roomName);
            onEnterGame(message.roomId, message.roomCode, message.playerId, message.playerName, message.roomName);
            navigate('/game');
            break;
          case 'opponent_joined':
            if (isWaiting) {
              const playerId = localStorage.getItem('playerId') || '';
              const playerName = localStorage.getItem('playerName') || '';
              const roomId = localStorage.getItem('roomId') || '';
              const roomCode = localStorage.getItem('roomCode') || '';
              const roomName = localStorage.getItem('roomName') || '';
              onEnterGame(roomId, roomCode, playerId, playerName, roomName);
              navigate('/game');
            }
            break;
          case 'join_failed':
            setError(message.reason);
            setTimeout(() => setError(''), 3000);
            break;
        }
      };

      ws.send(JSON.stringify({ type: 'get_room_list' }));
    }

    return () => {
      if (localWsRef.current) {
        localWsRef.current.onmessage = null;
      }
    };
  }, [ws, navigate, onEnterGame, isWaiting]);

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      setError('请输入玩家名称');
      return;
    }
    if (!roomName.trim()) {
      setError('请输入房间名称');
      return;
    }
    if (!ws) return;
    
    setError('');
    ws.send(JSON.stringify({
      type: 'create_room',
      roomName: roomName.trim(),
      playerName: playerName.trim()
    }));
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      setError('请输入玩家名称');
      return;
    }
    if (!joinCode.trim() || joinCode.length !== 6) {
      setError('请输入6位房间码');
      return;
    }
    if (!ws) return;
    
    setError('');
    ws.send(JSON.stringify({
      type: 'join_room',
      roomCode: joinCode.trim().toUpperCase(),
      playerName: playerName.trim()
    }));
  };

  const handleQuickJoin = (roomId: string) => {
    if (!playerName.trim()) {
      setError('请先输入玩家名称');
      return;
    }
    if (!ws) return;
    
    setError('');
    ws.send(JSON.stringify({
      type: 'join_room',
      roomCode: rooms.find(r => r.id === roomId)?.code || '',
      playerName: playerName.trim()
    }));
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(waitingRoomCode);
  };

  if (isWaiting) {
    return (
      <div style={styles.container}>
        <div style={styles.waitingCard}>
          <h2 style={styles.waitingTitle}>等待对手加入...</h2>
          <div style={styles.roomInfo}>
            <p style={styles.roomNameText}>房间: {waitingRoomName}</p>
            <div style={styles.codeContainer}>
              <span style={styles.codeLabel}>房间码:</span>
              <span style={styles.codeValue}>{waitingRoomCode}</span>
              <button style={styles.copyButton} onClick={copyRoomCode}>复制</button>
            </div>
          </div>
          <div style={styles.loadingSpinner}></div>
          <p style={styles.waitingHint}>请将房间码分享给另一位玩家</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>卡牌对战游戏</h1>
      
      <div style={styles.nameInputContainer}>
        <input
          type="text"
          placeholder="输入你的玩家名称"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          style={styles.nameInput}
          maxLength={20}
        />
      </div>

      <div style={styles.tabContainer}>
        <button
          style={{ ...styles.tabButton, ...(activeTab === 'create' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('create')}
        >
          创建房间
        </button>
        <button
          style={{ ...styles.tabButton, ...(activeTab === 'join' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('join')}
        >
          加入房间
        </button>
      </div>

      {error && <div style={styles.errorMessage}>{error}</div>}

      {activeTab === 'create' ? (
        <div style={styles.formContainer}>
          <input
            type="text"
            placeholder="输入房间名称"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            style={styles.input}
            maxLength={20}
          />
          <button style={styles.actionButton} onClick={handleCreateRoom}>
            创建房间
          </button>
        </div>
      ) : (
        <div style={styles.formContainer}>
          <input
            type="text"
            placeholder="输入6位房间码"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onFocus={() => setJoinInputFocused(true)}
            onBlur={() => setJoinInputFocused(false)}
            style={{
              ...styles.input,
              ...(joinInputFocused ? styles.focusedInput : {}),
              transition: 'border-color 0.3s ease, box-shadow 0.3s ease'
            }}
            maxLength={6}
          />
          <button style={styles.actionButton} onClick={handleJoinRoom}>
            加入房间
          </button>
        </div>
      )}

      <div style={styles.roomListContainer}>
        <h3 style={styles.roomListTitle}>可用房间</h3>
        <div style={styles.roomGrid}>
          {rooms.length === 0 ? (
            <p style={styles.noRooms}>暂无可用房间</p>
          ) : (
            rooms.map((room, index) => (
              <div
                key={room.id}
                style={{
                  ...styles.roomCard,
                  animation: `slideIn 0.3s ease forwards`,
                  animationDelay: `${index * 0.05}s`,
                  opacity: 0
                }}
              >
                <div style={styles.roomCardHeader}>
                  <span style={styles.roomCardName}>{room.name}</span>
                  <span style={styles.roomCardStatus}>{room.status}</span>
                </div>
                <div style={styles.roomCardFooter}>
                  <span style={styles.roomCardPlayers}>玩家: {room.playerCount}/2</span>
                  <button
                    style={styles.quickJoinButton}
                    onClick={() => handleQuickJoin(room.id)}
                    disabled={room.playerCount >= 2 || room.status !== '等待中'}
                  >
                    加入
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '40px 20px',
    backgroundColor: '#1a1a2e',
    color: '#fff',
    overflowY: 'auto' as const
  },
  title: {
    fontSize: '48px',
    marginBottom: '30px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  nameInputContainer: {
    width: '100%',
    maxWidth: '500px',
    marginBottom: '30px'
  },
  nameInput: {
    width: '100%',
    padding: '15px 20px',
    fontSize: '18px',
    borderRadius: '8px',
    border: '2px solid #3a3a5c',
    backgroundColor: '#252542',
    color: '#fff',
    outline: 'none'
  },
  tabContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px'
  },
  tabButton: {
    padding: '12px 30px',
    fontSize: '16px',
    borderRadius: '8px',
    border: '2px solid #3a3a5c',
    backgroundColor: '#252542',
    color: '#aaa',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  activeTab: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
    color: '#fff'
  },
  formContainer: {
    width: '100%',
    maxWidth: '500px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
    marginBottom: '40px'
  },
  input: {
    width: '100%',
    padding: '15px 20px',
    fontSize: '18px',
    borderRadius: '8px',
    border: '2px solid #3a3a5c',
    backgroundColor: '#252542',
    color: '#fff',
    outline: 'none'
  },
  focusedInput: {
    borderColor: '#667eea',
    boxShadow: '0 0 15px rgba(102, 126, 234, 0.5)'
  },
  actionButton: {
    padding: '15px 30px',
    fontSize: '18px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    fontWeight: 'bold'
  },
  errorMessage: {
    backgroundColor: 'rgba(198, 40, 40, 0.3)',
    color: '#ff5252',
    padding: '10px 20px',
    borderRadius: '8px',
    marginBottom: '15px',
    border: '1px solid #c62828'
  },
  roomListContainer: {
    width: '100%',
    maxWidth: '800px'
  },
  roomListTitle: {
    fontSize: '24px',
    marginBottom: '20px',
    textAlign: 'center' as const
  },
  roomGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px'
  },
  roomCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
  },
  roomCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  roomCardName: {
    fontSize: '18px',
    fontWeight: 'bold'
  },
  roomCardStatus: {
    padding: '4px 12px',
    borderRadius: '20px',
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
    color: '#667eea',
    fontSize: '14px'
  },
  roomCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  roomCardPlayers: {
    color: '#aaa'
  },
  quickJoinButton: {
    padding: '8px 20px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#667eea',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'opacity 0.2s ease'
  },
  noRooms: {
    textAlign: 'center' as const,
    color: '#666',
    gridColumn: '1 / -1'
  },
  waitingCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '20px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  waitingTitle: {
    fontSize: '32px',
    marginBottom: '30px'
  },
  roomInfo: {
    marginBottom: '30px',
    textAlign: 'center' as const
  },
  roomNameText: {
    fontSize: '24px',
    marginBottom: '15px',
    color: '#667eea'
  },
  codeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  codeLabel: {
    fontSize: '18px',
    color: '#aaa'
  },
  codeValue: {
    fontSize: '36px',
    fontWeight: 'bold',
    letterSpacing: '5px',
    color: '#667eea'
  },
  copyButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#3a3a5c',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px'
  },
  loadingSpinner: {
    width: '60px',
    height: '60px',
    border: '4px solid #3a3a5c',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  waitingHint: {
    color: '#666',
    fontSize: '16px'
  }
} as const;

export default RoomManager;
