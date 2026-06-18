import React, { useState } from 'react';
import { useStore } from '../store.js';
import { wsManager } from '../wsManager.js';

interface Props {
  onCreateRoom: () => void;
}

const CollaborationPanel: React.FC<Props> = ({ onCreateRoom }) => {
  const users = useStore((s) => s.users);
  const currentUser = useStore((s) => s.currentUser);
  const roomId = useStore((s) => s.roomId);
  const leaveRoom = useStore((s) => s.leaveRoom);

  const [roomInput, setRoomInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(!roomId);

  const handleJoin = () => {
    const code = roomInput.trim().toUpperCase();
    if (!code || code.length < 4) return;
    const name = nameInput.trim() || '访客';
    wsManager.connect(code, name);
    setShowJoinForm(false);
    setRoomInput('');
    setNameInput('');
  };

  const handleCreate = () => {
    const name = nameInput.trim() || '访客';
    onCreateRoom();
    setShowJoinForm(false);
    setNameInput('');
  };

  const handleLeave = () => {
    wsManager.disconnect();
    leaveRoom();
    setShowJoinForm(true);
  };

  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard?.writeText(roomId).catch(() => {});
    }
  };

  return (
    <div
      style={{
        background: 'rgba(20, 30, 60, 0.6)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        backdropFilter: 'blur(12px)',
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minWidth: 240,
        maxWidth: 280,
      }}
    >
      <style>{`
        .collab-input {
          width: 100%;
          padding: 9px 12px;
          background: rgba(10, 15, 28, 0.8);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          color: #e0e5ec;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .collab-input:focus {
          border-color: rgba(120, 180, 255, 0.6);
          box-shadow: 0 0 0 3px rgba(120, 180, 255, 0.15);
        }
        .collab-btn {
          width: 100%;
          padding: 10px 14px;
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          background: linear-gradient(135deg, #4a7df5 0%, #6a5af5 100%);
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .collab-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 8px;
          padding: 1.5px;
          background: linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.05));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .collab-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 14px rgba(106, 90, 245, 0.45);
        }
        .collab-btn-secondary {
          background: linear-gradient(135deg, #2a3a5c 0%, #1a2540 100%);
        }
      `}</style>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
      }}>
        <div style={{
          width: 22, height: 22,
          borderRadius: 6,
          background: 'linear-gradient(135deg, #4a7df5, #6a5af5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
        }}>👥</div>
        <span style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#e0e5ec',
          letterSpacing: 0.3,
        }}>协作房间</span>
      </div>

      {showJoinForm && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            className="collab-input"
            placeholder="你的昵称"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            maxLength={16}
          />
          <input
            className="collab-input"
            placeholder="6位房间码"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
            maxLength={6}
            style={{ letterSpacing: 2, textTransform: 'uppercase' }}
          />
          <button className="collab-btn" onClick={handleJoin}>
            加入房间
          </button>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 11, color: '#6a7a9a', margin: '2px 0',
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span>或</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>
          <button className="collab-btn collab-btn-secondary" onClick={handleCreate}>
            创建新房间
          </button>
        </div>
      )}

      {!showJoinForm && roomId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            onClick={copyRoomId}
            style={{
              padding: '10px 12px',
              background: 'rgba(10, 15, 28, 0.8)',
              borderRadius: 8,
              border: '1px solid rgba(74, 125, 245, 0.3)',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'border-color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(74, 125, 245, 0.6)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(74, 125, 245, 0.3)')}
          >
            <div>
              <div style={{ fontSize: 10, color: '#6a7a9a', marginBottom: 2 }}>房间码 (点击复制)</div>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 4,
                color: '#7aaeff',
                fontFamily: 'monospace',
              }}>{roomId}</div>
            </div>
            <span style={{ fontSize: 14 }}>📋</span>
          </div>

          <div style={{
            fontSize: 11,
            color: '#6a7a9a',
            marginTop: 2,
          }}>
            在线成员 ({users.length})
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            maxHeight: 200,
            overflowY: 'auto',
          }}>
            {users.map((u) => (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 10px',
                  borderRadius: 8,
                  background: u.id === currentUser?.id
                    ? 'rgba(74, 125, 245, 0.15)'
                    : 'rgba(10, 15, 28, 0.6)',
                  border: u.id === currentUser?.id
                    ? '1px solid rgba(74, 125, 245, 0.3)'
                    : '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div style={{
                  width: 18, height: 18,
                  borderRadius: '50%',
                  background: u.color,
                  boxShadow: `0 0 8px ${u.color}88`,
                  flexShrink: 0,
                }} />
                <div style={{
                  flex: 1,
                  fontSize: 12,
                  color: '#d0d8e8',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {u.name}
                  {u.id === currentUser?.id && (
                    <span style={{ color: '#7aaeff', marginLeft: 4 }}>(我)</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            className="collab-btn collab-btn-secondary"
            onClick={handleLeave}
            style={{ marginTop: 4 }}
          >
            离开房间
          </button>
        </div>
      )}
    </div>
  );
};

export default CollaborationPanel;
