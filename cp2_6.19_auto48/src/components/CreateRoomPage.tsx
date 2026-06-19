import React, { useState } from 'react';
import type { Theme } from '../types';

interface CreateRoomPageProps {
  onCreate: (roomName: string, nickname: string) => void;
  onBack: () => void;
  theme: Theme;
}

const CreateRoomPage: React.FC<CreateRoomPageProps> = ({ onCreate, onBack, theme }) => {
  const [roomName, setRoomName] = useState('');
  const [nickname, setNickname] = useState('');
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    
    setRipples((prev) => [...prev, { id, x, y }]);
    
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName.trim() && nickname.trim()) {
      onCreate(roomName.trim(), nickname.trim());
    }
  };

  return (
    <div className="join-page" style={{ background: `linear-gradient(135deg, ${theme.primaryColor}22 0%, ${theme.primaryColor}44 100%)` }}>
      <button className="back-btn" onClick={onBack}>
        ← 返回选择
      </button>
      <form className="join-form" onSubmit={handleSubmit}>
        <h2 className="join-title">创建课堂</h2>
        
        <div className="form-group">
          <label className="form-label">课堂名称</label>
          <input
            type="text"
            className="form-input"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="请输入课堂名称"
            maxLength={30}
            style={{ '--primary-color': theme.primaryColor } as React.CSSProperties}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">教师昵称</label>
          <input
            type="text"
            className="form-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="请输入你的昵称"
            maxLength={20}
            style={{ '--primary-color': theme.primaryColor } as React.CSSProperties}
          />
        </div>
        
        <button
          type="submit"
          className="btn btn-primary btn-ripple"
          onClick={handleRipple}
          disabled={!roomName.trim() || !nickname.trim()}
          style={{
            backgroundColor: theme.primaryColor,
            opacity: roomName.trim() && nickname.trim() ? 1 : 0.5,
            cursor: roomName.trim() && nickname.trim() ? 'pointer' : 'not-allowed'
          }}
        >
          创建房间
          {ripples.map((ripple) => (
            <span
              key={ripple.id}
              className="ripple"
              style={{ left: ripple.x, top: ripple.y }}
            />
          ))}
        </button>
      </form>
    </div>
  );
};

export default CreateRoomPage;
