import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useScoreStore } from '@/store/useScoreStore';
import { generateRoomCode, Note, USER_COLORS } from '@/types';

interface WSMessage {
  type: 'hello' | 'welcome' | 'user_join' | 'user_leave' | 'note_add' | 'note_remove' | 'note_update' | 'cursor' | 'sync_notes' | 'ping';
  payload: any;
  roomCode: string;
  userId: string;
  timestamp: number;
}

export const CollaborationPanel: React.FC = () => {
  const [joinCode, setJoinCode] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [error, setError] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  const roomCode = useScoreStore((s) => s.roomCode);
  const isConnected = useScoreStore((s) => s.isConnected);
  const userId = useScoreStore((s) => s.userId);
  const userName = useScoreStore((s) => s.userName);
  const userColor = useScoreStore((s) => s.userColor);
  const collaborators = useScoreStore((s) => s.collaborators);
  const notes = useScoreStore((s) => s.notes);

  const setRoomCode = useScoreStore((s) => s.setRoomCode);
  const setConnected = useScoreStore((s) => s.setConnected);
  const addCollaborator = useScoreStore((s) => s.addCollaborator);
  const removeCollaborator = useScoreStore((s) => s.removeCollaborator);
  const removeCursor = useScoreStore((s) => s.removeCursor);
  const setUserName = useScoreStore((s) => s.setUserName);
  const addNote = useScoreStore((s) => s.addNote);
  const removeNote = useScoreStore((s) => s.removeNote);
  const updateNote = useScoreStore((s) => s.updateNote);
  const updateCursor = useScoreStore((s) => s.updateCursor);
  const loadNotes = useScoreStore((s) => s.loadNotes);

  const channelRef = useRef<BroadcastChannel | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messageQueueRef = useRef<WSMessage[]>([]);

  const broadcastMessage = useCallback((message: WSMessage) => {
    if (channelRef.current) {
      try {
        channelRef.current.postMessage(message);
      } catch (e) {
        console.warn('Broadcast failed:', e);
      }
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
      } catch (e) {
        console.warn('WebSocket send failed:', e);
      }
    }
  }, []);

  const handleMessage = useCallback((message: WSMessage) => {
    if (message.userId === userId) return;
    if (message.roomCode !== roomCode) return;

    switch (message.type) {
      case 'hello': {
        addCollaborator({
          id: message.payload.userId,
          name: message.payload.userName,
          color: message.payload.userColor,
          connected: true,
        });
        const welcomeMsg: WSMessage = {
          type: 'welcome',
          payload: {
            userId,
            userName,
            userColor,
            notes: notes,
          },
          roomCode: roomCode!,
          userId,
          timestamp: Date.now(),
        };
        broadcastMessage(welcomeMsg);
        break;
      }
      case 'welcome': {
        addCollaborator({
          id: message.payload.userId,
          name: message.payload.userName,
          color: message.payload.userColor,
          connected: true,
        });
        if (message.payload.notes && notes.length === 0) {
          loadNotes(message.payload.notes);
        }
        break;
      }
      case 'user_leave': {
        removeCollaborator(message.payload.userId);
        removeCursor(message.payload.userId);
        break;
      }
      case 'note_add': {
        const exists = notes.some((n) => n.id === message.payload.id);
        if (!exists) {
          addNote(message.payload);
        }
        break;
      }
      case 'note_remove': {
        removeNote(message.payload.noteId);
        break;
      }
      case 'note_update': {
        updateNote(message.payload.noteId, message.payload.updates);
        break;
      }
      case 'cursor': {
        updateCursor(message.payload);
        break;
      }
    }
  }, [userId, roomCode, notes, userName, userColor, addCollaborator, removeCollaborator, removeCursor, loadNotes, addNote, removeNote, updateNote, updateCursor, broadcastMessage]);

  useEffect(() => {
    if (!showPanel || !roomCode) return;

    const channel = new BroadcastChannel(`score_room_${roomCode}`);
    channelRef.current = channel;

    channel.onmessage = (event) => {
      handleMessage(event.data as WSMessage);
    };

    const helloMsg: WSMessage = {
      type: 'hello',
      payload: { userId, userName, userColor },
      roomCode,
      userId,
      timestamp: Date.now(),
    };
    broadcastMessage(helloMsg);

    addCollaborator({
      id: userId,
      name: userName,
      color: userColor,
      connected: true,
    });

    const wsTryUrl = `ws://${window.location.hostname}:8080/ws?room=${roomCode}&user=${userId}`;
    try {
      const ws = new WebSocket(wsTryUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        messageQueueRef.current.forEach((msg) => ws.send(JSON.stringify(msg)));
        messageQueueRef.current = [];
      };

      ws.onmessage = (event) => {
        try {
          handleMessage(JSON.parse(event.data));
        } catch (e) {
          console.warn('Invalid WS message:', e);
        }
      };

      ws.onerror = () => {
        wsRef.current = null;
      };

      ws.onclose = () => {
        wsRef.current = null;
      };
    } catch (e) {
      console.log('WebSocket not available, using BroadcastChannel only');
    }

    setConnected(true);

    const handleBeforeUnload = () => {
      const leaveMsg: WSMessage = {
        type: 'user_leave',
        payload: { userId },
        roomCode: roomCode!,
        userId,
        timestamp: Date.now(),
      };
      broadcastMessage(leaveMsg);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      handleBeforeUnload();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      channel.close();
      channelRef.current = null;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnected(false);
    };
  }, [showPanel, roomCode, userId, userName, userColor, handleMessage, broadcastMessage, addCollaborator, setConnected]);

  useEffect(() => {
    if (!isConnected || !roomCode) return;

    const interval = setInterval(() => {
      const cursor = useScoreStore.getState().cursors[userId];
      if (cursor) {
        const msg: WSMessage = {
          type: 'cursor',
          payload: cursor,
          roomCode,
          userId,
          timestamp: Date.now(),
        };
        broadcastMessage(msg);
      }
    }, 80);

    return () => clearInterval(interval);
  }, [isConnected, roomCode, userId, broadcastMessage]);

  const createRoom = () => {
    setError('');
    const code = generateRoomCode();
    setRoomCode(code);
    setShowPanel(true);
  };

  const joinRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      setError('请输入6位有效的邀请码');
      return;
    }
    setError('');
    setRoomCode(code);
    setShowPanel(true);
  };

  const leaveRoom = () => {
    const leaveMsg: WSMessage = {
      type: 'user_leave',
      payload: { userId },
      roomCode: roomCode!,
      userId,
      timestamp: Date.now(),
    };
    broadcastMessage(leaveMsg);
    setRoomCode(null);
    setConnected(false);
    setShowPanel(false);
    if (channelRef.current) {
      channelRef.current.close();
      channelRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const copyRoomCode = async () => {
    if (roomCode) {
      try {
        await navigator.clipboard.writeText(roomCode);
      } catch (e) {
        console.warn('Copy failed:', e);
      }
    }
  };

  const connectedUsers = collaborators.filter((c) => c.connected);

  if (!showPanel) {
    return (
      <div style={styles.entryContainer}>
        <button onClick={createRoom} style={styles.createBtn}>
          ✨ 创建协作房间
        </button>
        <div style={styles.joinRow}>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="输入6位邀请码"
            maxLength={6}
            style={styles.codeInput}
          />
          <button onClick={joinRoom} style={styles.joinBtn}>
            加入
          </button>
        </div>
        {error && <span style={styles.errorText}>{error}</span>}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>👥 协作房间</span>
        <button onClick={() => setShowPanel(!showPanel)} style={styles.toggleBtn}>
          {showPanel ? '▼' : '▲'}
        </button>
      </div>

      <div style={styles.roomInfo}>
        <div style={styles.roomCodeRow}>
          <span style={styles.roomCodeLabel}>房间号:</span>
          <span style={styles.roomCodeText}>{roomCode}</span>
          <button onClick={copyRoomCode} style={styles.copyBtn} title="复制邀请码">
            📋
          </button>
        </div>
        <div style={styles.statusRow}>
          <span
            style={{
              ...styles.statusDot,
              backgroundColor: isConnected ? '#55efc4' : '#ff6b6b',
            }}
          />
          <span style={styles.statusText}>
            {isConnected ? '已连接' : '未连接'} · {connectedUsers.length} 人在线
          </span>
        </div>
      </div>

      <div style={styles.userSection}>
        <div style={styles.userSectionHeader}>
          <span style={styles.userSectionTitle}>在线成员</span>
        </div>
        <div style={styles.userList}>
          {connectedUsers.map((user) => (
            <div key={user.id} style={styles.userItem}>
              <span
                style={{
                  ...styles.userAvatar,
                  backgroundColor: user.color,
                }}
              >
                {user.name.charAt(0).toUpperCase()}
              </span>
              <div style={styles.userInfo}>
                <span style={styles.userName}>
                  {user.name}
                  {user.id === userId && <span style={styles.youTag}> (你)</span>}
                </span>
              </div>
              {user.id === userId && (
                <button
                  onClick={() => {
                    setTempName(userName);
                    setEditingName(true);
                  }}
                  style={styles.editBtn}
                >
                  ✏️
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {editingName && (
        <div style={styles.editNameContainer}>
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            placeholder="输入昵称"
            style={styles.nameInput}
            maxLength={12}
          />
          <div style={styles.colorPicker}>
            {USER_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  localStorage.setItem('score_user_color', c);
                  location.reload();
                }}
                style={{
                  ...styles.colorBtn,
                  backgroundColor: c,
                }}
              />
            ))}
          </div>
          <div style={styles.editActions}>
            <button
              onClick={() => {
                setUserName(tempName);
                setEditingName(false);
              }}
              style={styles.saveBtn}
            >
              保存
            </button>
            <button onClick={() => setEditingName(false)} style={styles.cancelBtn}>
              取消
            </button>
          </div>
        </div>
      )}

      <button onClick={leaveRoom} style={styles.leaveBtn}>
        🚪 离开房间
      </button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  entryContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  createBtn: {
    background: 'linear-gradient(135deg, #ff6b6b 0%, #a29bfe 100%)',
    color: '#fff',
    border: 'none',
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 15px rgba(255, 107, 107, 0.25)',
  },
  joinRow: {
    display: 'flex',
    gap: '8px',
  },
  codeInput: {
    flex: 1,
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    letterSpacing: '3px',
    textAlign: 'center',
    textTransform: 'uppercase',
    outline: 'none',
  },
  joinBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #48dbfb 0%, #0984e3 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: '12px',
    textAlign: 'center',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#e0e0e0',
    fontSize: '14px',
    fontWeight: '600',
  },
  toggleBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    color: '#aaa',
    padding: '4px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  roomInfo: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '8px',
    padding: '10px',
  },
  roomCodeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },
  roomCodeLabel: {
    color: '#888',
    fontSize: '12px',
  },
  roomCodeText: {
    color: '#48dbfb',
    fontSize: '18px',
    fontWeight: '700',
    letterSpacing: '4px',
    fontFamily: 'monospace',
  },
  copyBtn: {
    background: 'rgba(72, 219, 251, 0.15)',
    border: 'none',
    color: '#48dbfb',
    padding: '4px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    boxShadow: '0 0 8px currentColor',
  },
  statusText: {
    color: '#aaa',
    fontSize: '12px',
  },
  userSection: {
    marginTop: '4px',
  },
  userSectionHeader: {
    marginBottom: '6px',
  },
  userSectionTitle: {
    color: '#888',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  userList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
  },
  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: '700',
    fontSize: '14px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#e0e0e0',
    fontSize: '13px',
    fontWeight: '500',
  },
  youTag: {
    color: '#55efc4',
    fontSize: '11px',
  },
  editBtn: {
    background: 'transparent',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    padding: '4px',
    fontSize: '12px',
  },
  editNameContainer: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  nameInput: {
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
  },
  colorPicker: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  colorBtn: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  editActions: {
    display: 'flex',
    gap: '8px',
  },
  saveBtn: {
    flex: 1,
    padding: '8px',
    background: 'linear-gradient(135deg, #55efc4, #00b894)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelBtn: {
    flex: 1,
    padding: '8px',
    background: 'rgba(255,255,255,0.05)',
    color: '#aaa',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  leaveBtn: {
    padding: '10px',
    background: 'rgba(255, 107, 107, 0.15)',
    color: '#ff6b6b',
    border: '1px solid rgba(255, 107, 107, 0.3)',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '4px',
    transition: 'all 0.2s',
  },
};

export default CollaborationPanel;
