import React, { useState } from 'react';
import { PRESET_COLORS } from './types';

interface LoginPageProps {
  onJoin: (nickname: string, color: string, roomCode?: string) => Promise<void>;
}

const LoginPage: React.FC<LoginPageProps> = ({ onJoin }) => {
  const [nickname, setNickname] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[7]);
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!nickname.trim() || nickname.length > 12) {
      setError('昵称必须在1-12字符之间');
      setLoading(false);
      return;
    }

    if (mode === 'join' && !/^[A-Za-z]{6}$/.test(roomCode)) {
      setError('房间码必须是6位字母');
      setLoading(false);
      return;
    }

    try {
      await onJoin(nickname.trim(), selectedColor, mode === 'join' ? roomCode.toUpperCase() : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '48px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px'
          }}>
            ✨ 创意写作协作
          </h1>
          <p style={{ color: '#6b7280', fontSize: '15px' }}>
            与朋友一起创作精彩故事
          </p>
        </div>

        <div style={{
          display: 'flex',
          background: '#f3f4f6',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '28px'
        }}>
          <button
            type="button"
            onClick={() => setMode('create')}
            style={{
              flex: 1,
              padding: '12px 24px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '14px',
              background: mode === 'create' ? 'white' : 'transparent',
              color: mode === 'create' ? '#6366f1' : '#6b7280',
              boxShadow: mode === 'create' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            创建房间
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            style={{
              flex: 1,
              padding: '12px 24px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '14px',
              background: mode === 'join' ? 'white' : 'transparent',
              color: mode === 'join' ? '#6366f1' : '#6b7280',
              boxShadow: mode === 'join' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            加入房间
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '8px'
            }}>
              你的昵称
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={12}
              placeholder="输入昵称（最多12个字符，支持emoji）"
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                fontSize: '15px',
                transition: 'border-color 0.2s',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#6366f1'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
            <div style={{
              textAlign: 'right',
              fontSize: '12px',
              color: '#9ca3af',
              marginTop: '4px'
            }}>
              {nickname.length}/12
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '12px'
            }}>
              选择颜色
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '12px'
            }}>
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  style={{
                    width: '100%',
                    paddingBottom: '100%',
                    background: color,
                    borderRadius: '50%',
                    position: 'relative',
                    transform: selectedColor === color ? 'scale(1.15)' : 'scale(1)',
                    boxShadow: selectedColor === color ? `0 0 0 3px white, 0 0 0 5px ${color}` : 'none',
                    transition: 'all 0.2s'
                  }}
                />
              ))}
            </div>
          </div>

          {mode === 'join' && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '8px'
              }}>
                房间码
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="输入6位房间码"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '18px',
                  letterSpacing: '8px',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  transition: 'border-color 0.2s',
                  outline: 'none',
                  fontFamily: 'monospace'
                }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          )}

          {error && (
            <div style={{
              background: '#fef2f2',
              color: '#dc2626',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              fontSize: '16px',
              fontWeight: 600,
              borderRadius: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {loading ? '处理中...' : mode === 'create' ? '🚀 创建房间' : '🎯 加入房间'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
