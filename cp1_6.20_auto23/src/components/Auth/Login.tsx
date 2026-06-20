import { useState } from 'react';
import './Login.css';

interface LoginProps {
  onCreateRoom: (nickname: string, roomName: string) => void;
  onJoinRoom: (nickname: string, roomId: string) => void;
  isLoading?: boolean;
}

const Login = ({ onCreateRoom, onJoinRoom, isLoading = false }: LoginProps) => {
  const [nickname, setNickname] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    if (mode === 'create') {
      if (!roomName.trim()) return;
      onCreateRoom(nickname.trim(), roomName.trim());
    } else {
      if (!roomId.trim()) return;
      onJoinRoom(nickname.trim(), roomId.trim().toUpperCase());
    }
  };

  const canSubmit = () => {
    if (!nickname.trim()) return false;
    if (mode === 'create' && !roomName.trim()) return false;
    if (mode === 'join' && !roomId.trim()) return false;
    if (isLoading) return false;
    return true;
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <svg viewBox="0 0 24 24" className="logo-icon">
              <circle cx="12" cy="12" r="3" fill="#1a73e8" />
              <circle cx="4" cy="6" r="2" fill="#34a853" />
              <circle cx="4" cy="18" r="2" fill="#fbbc04" />
              <circle cx="20" cy="12" r="2" fill="#ea4335" />
              <path
                d="M7 6 L9.5 10.5"
                stroke="#e0e0e0"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M7 18 L9.5 13.5"
                stroke="#e0e0e0"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M17 12 L15 12"
                stroke="#e0e0e0"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
          </div>
          <h1 className="login-title">协作思维导图</h1>
          <p className="login-subtitle">实时协作，创意思维</p>
        </div>

        <div className="mode-tabs">
          <button
            className={`mode-tab ${mode === 'create' ? 'active' : ''}`}
            onClick={() => setMode('create')}
            type="button"
          >
            创建房间
          </button>
          <button
            className={`mode-tab ${mode === 'join' ? 'active' : ''}`}
            onClick={() => setMode('join')}
            type="button"
          >
            加入房间
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">您的昵称</label>
            <input
              type="text"
              className="form-input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="请输入昵称"
              autoFocus
            />
          </div>

          {mode === 'create' ? (
            <div className="form-group">
              <label className="form-label">思维导图名称</label>
              <input
                type="text"
                className="form-input"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="请输入思维导图名称"
              />
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">房间号</label>
              <input
                type="text"
                className="form-input"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="请输入房间号"
                style={{ textTransform: 'uppercase' }}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={!canSubmit()}
          >
            {isLoading
              ? '处理中...'
              : mode === 'create'
              ? '创建并进入'
              : '加入房间'}
          </button>
        </form>

        <div className="login-footer">
          <p>💡 提示：创建房间后可分享房间号邀请他人协作</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
