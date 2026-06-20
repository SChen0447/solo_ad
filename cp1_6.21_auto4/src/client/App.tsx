import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Board } from './components/Board';
import { CardData, Participant } from './types';
import { initDB, saveCards, getCards, saveParticipants, getParticipants, saveRoomInfo, getRoomInfo, clearRoomData } from './utils/db';

const WS_URL = 'ws://localhost:8080';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const App: React.FC = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [cards, setCards] = useState<CardData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [userName, setUserName] = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbReady, setDbReady] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const toastIdRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2500);
  }, []);

  useEffect(() => {
    initDB()
      .then(() => {
        setDbReady(true);
        return getRoomInfo();
      })
      .then(async (roomInfo) => {
        if (roomInfo.roomId && roomInfo.clientId && roomInfo.name && roomInfo.avatar) {
          const cachedCards = await getCards();
          const cachedParticipants = await getParticipants();
          setRoomId(roomInfo.roomId);
          setClientId(roomInfo.clientId);
          setUserName(roomInfo.name);
          setUserAvatar(roomInfo.avatar);
          setParticipant({
            id: roomInfo.clientId,
            name: roomInfo.name,
            avatar: roomInfo.avatar
          });
          setCards(cachedCards);
          setParticipants(cachedParticipants);
          setIsJoining(true);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
        setDbReady(true);
      });
  }, []);

  useEffect(() => {
    if (!isJoining || !dbReady) return;

    const connect = () => {
      const socket = new WebSocket(WS_URL);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        setWs(socket);
        
        if (roomId && participant) {
          socket.send(JSON.stringify({
            type: 'join_room',
            payload: {
              roomId,
              name: participant.name,
              avatar: participant.avatar
            }
          }));
        }
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleMessage(message);
      };

      socket.onclose = () => {
        setIsConnected(false);
        setWs(null);
        showToast('连接断开，正在重连...', 'info');
        
        if (!reconnectTimerRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            connect();
          }, 2000);
        }
      };

      socket.onerror = () => {
        console.error('WebSocket error');
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [isJoining, dbReady]);

  const handleMessage = useCallback((message: { type: string; payload: any }) => {
    const { type, payload } = message;

    switch (type) {
      case 'room_created':
        setRoomId(payload.roomId);
        setClientId(payload.clientId);
        setParticipant(payload.participant);
        setParticipants([payload.participant]);
        setIsJoining(true);
        if (dbReady) {
          saveRoomInfo(payload.roomId, payload.clientId, payload.participant.name, payload.participant.avatar);
        }
        showToast('会议室创建成功！', 'success');
        break;

      case 'room_joined':
        setRoomId(payload.roomId);
        setClientId(payload.clientId);
        setParticipant(payload.participant);
        setParticipants(payload.participants);
        setCards(payload.cards);
        if (dbReady) {
          saveRoomInfo(payload.roomId, payload.clientId, payload.participant.name, payload.participant.avatar);
          saveCards(payload.cards);
          saveParticipants(payload.participants);
        }
        showToast('加入会议室成功！', 'success');
        break;

      case 'cards_updated':
        setCards(payload);
        if (dbReady) {
          saveCards(payload);
        }
        break;

      case 'participants_updated':
        setParticipants(payload);
        if (dbReady) {
          saveParticipants(payload);
        }
        break;

      case 'card_lock_changed':
        setCards(prev => prev.map(card =>
          card.id === payload.cardId
            ? { ...card, lockedBy: payload.lockedBy }
            : card
        ));
        break;

      case 'card_locked':
        showToast('卡片正在被其他用户编辑', 'error');
        break;

      case 'error':
        showToast(payload.message, 'error');
        break;
    }
  }, [dbReady, showToast]);

  const sendMessage = useCallback((type: string, payload: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload: { ...payload, roomId } }));
    }
  }, [ws, roomId]);

  const handleCreateRoom = () => {
    if (!userName.trim()) {
      showToast('请输入您的姓名', 'error');
      return;
    }

    const avatar = userAvatar || generateDefaultAvatar(userName);
    setUserAvatar(avatar);

    const socket = new WebSocket(WS_URL);
    wsRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setWs(socket);
      socket.send(JSON.stringify({
        type: 'create_room',
        payload: { name: userName.trim(), avatar }
      }));
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleMessage(message);
    };

    socket.onclose = () => {
      setIsConnected(false);
      setWs(null);
    };
  };

  const handleJoinRoom = () => {
    if (!userName.trim()) {
      showToast('请输入您的姓名', 'error');
      return;
    }
    if (!joinRoomInput.trim()) {
      showToast('请输入参会码', 'error');
      return;
    }

    const avatar = userAvatar || generateDefaultAvatar(userName);
    setUserAvatar(avatar);
    setIsJoining(true);

    const socket = new WebSocket(WS_URL);
    wsRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setWs(socket);
      socket.send(JSON.stringify({
        type: 'join_room',
        payload: {
          roomId: joinRoomInput.trim().toUpperCase(),
          name: userName.trim(),
          avatar
        }
      }));
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleMessage(message);
    };

    socket.onclose = () => {
      setIsConnected(false);
      setWs(null);
      showToast('连接断开，正在重连...', 'info');
      
      if (!reconnectTimerRef.current) {
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          if (wsRef.current) {
            wsRef.current = new WebSocket(WS_URL);
          }
        }, 2000);
      }
    };
  };

  const handleLeaveRoom = async () => {
    if (ws) {
      ws.close();
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    await clearRoomData();
    setRoomId('');
    setClientId('');
    setParticipant(null);
    setParticipants([]);
    setCards([]);
    setIsJoining(false);
    setIsConnected(false);
    setWs(null);
    showToast('已离开会议室', 'info');
  };

  const handleAddCard = (columnId: string, title: string) => {
    sendMessage('add_card', { columnId, title });
    showToast('卡片已添加', 'success');
  };

  const handleMoveCard = (cardId: string, toColumnId: string, toIndex: number) => {
    sendMessage('move_card', { cardId, toColumnId, toIndex });
  };

  const handleEditCard = (cardId: string, updates: Partial<CardData>) => {
    sendMessage('update_card', { cardId, updates });
    showToast('卡片已更新', 'success');
  };

  const handleDeleteCard = (cardId: string) => {
    sendMessage('delete_card', { cardId });
    showToast('卡片已删除', 'success');
  };

  const handleLockCard = (cardId: string) => {
    sendMessage('lock_card', { cardId });
  };

  const handleUnlockCard = (cardId: string) => {
    sendMessage('unlock_card', { cardId });
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    showToast('参会码已复制', 'success');
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  if (!isJoining) {
    return (
      <div className="app-container">
        <div className="login-container">
          <div className="login-header">
            <h1>团队协作看板</h1>
            <p>站会 · 复盘 · 实时协作</p>
          </div>

          <div className="login-form">
            <div className="form-group">
              <label>您的姓名</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="请输入您的姓名"
                className="form-input"
              />
            </div>

            <div className="form-divider">
              <span>或</span>
            </div>

            <button className="btn btn-primary btn-large" onClick={handleCreateRoom}>
              创建新会议室
            </button>

            <div className="form-divider">
              <span>输入参会码加入</span>
            </div>

            <div className="form-group">
              <input
                type="text"
                value={joinRoomInput}
                onChange={(e) => setJoinRoomInput(e.target.value.toUpperCase())}
                placeholder="请输入参会码"
                className="form-input room-input"
                maxLength={6}
              />
            </div>

            <button className="btn btn-secondary btn-large" onClick={handleJoinRoom}>
              加入会议室
            </button>
          </div>
        </div>

        <div className="toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              {toast.message}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1>团队协作看板</h1>
          <div className="room-info">
            <span className="room-label">参会码：</span>
            <span className="room-id" onClick={copyRoomId} title="点击复制">
              {roomId}
            </span>
            <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? '● 已连接' : '● 断开'}
            </span>
          </div>
        </div>

        <div className="header-right">
          <div className="participants-list">
            {participants.map(p => (
              <div key={p.id} className="participant-avatar" title={p.name}>
                <img src={p.avatar} alt={p.name} />
                <span className="participant-name">{p.name}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary" onClick={handleLeaveRoom}>
            离开
          </button>
        </div>
      </header>

      <main className="app-main">
        <Board
          cards={cards}
          participants={participants}
          clientId={clientId}
          onAddCard={handleAddCard}
          onMoveCard={handleMoveCard}
          onEditCard={handleEditCard}
          onDeleteCard={handleDeleteCard}
          onLockCard={handleLockCard}
          onUnlockCard={handleUnlockCard}
        />
      </main>

      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
};

function generateDefaultAvatar(name: string): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
  const colorIndex = name.charCodeAt(0) % colors.length;
  const color = colors[colorIndex];
  const initial = name.charAt(0).toUpperCase();
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="20" fill="${color}"/>
      <text x="20" y="26" text-anchor="middle" fill="white" font-size="18" font-family="Arial, sans-serif" font-weight="bold">${initial}</text>
    </svg>
  `;
  
  return 'data:image/svg+xml;base64,' + btoa(svg.trim());
}

export default App;
