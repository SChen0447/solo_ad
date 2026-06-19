import React, { useState } from 'react';

interface JoinPageProps {
  onJoin: (roomId: string, nickname: string) => boolean;
  onBack: () => void;
  error?: string;
}

const JoinPage: React.FC<JoinPageProps> = ({ onJoin, onBack, error }) => {
  const [roomId, setRoomId] = useState('');
  const [nickname, setNickname] = useState('');
  const [isPressed, setIsPressed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim() && nickname.trim()) {
      const success = onJoin(roomId.trim().toUpperCase(), nickname.trim());
      if (!success) {
      }
    }
  };

  return (
    <div className="join-page">
      <button className="back-btn" onClick={onBack}>
        ← 返回选择
      </button>
      <form className="join-form" onSubmit={handleSubmit}>
        <h2 className="join-title">加入课堂</h2>
        
        <div className="form-group">
          <label className="form-label">房间号</label>
          <input
            type="text"
            className="form-input"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            placeholder="请输入6位房间号"
            maxLength={6}
            style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '18px' }}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">你的昵称</label>
          <input
            type="text"
            className="form-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="请输入你的昵称"
            maxLength={20}
          />
        </div>

        {error && (
          <div style={{ color: '#ff4d4f', fontSize: '14px', textAlign: 'center' }}>
            {error}
          </div>
        )}
        
        <button
          type="submit"
          className={`btn btn-primary btn-press ${isPressed ? 'pressed' : ''}`}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
          disabled={!roomId.trim() || !nickname.trim()}
          style={{
            opacity: !roomId.trim() || !nickname.trim() ? 0.5 : 1,
            cursor: !roomId.trim() || !nickname.trim() ? 'not-allowed' : 'pointer'
          }}
        >
          加入房间
        </button>
      </form>
    </div>
  );
};

export default JoinPage;
