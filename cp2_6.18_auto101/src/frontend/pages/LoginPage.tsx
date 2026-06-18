import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, User } from 'lucide-react';
import { useAppStore } from '../store';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useAppStore((state) => state.login);
  const showToast = useAppStore((state) => state.showToast);
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: string })?.from || '/admin';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (login(username, password)) {
      showToast('登录成功！', 'success');
      navigate(from, { replace: true });
    } else {
      setError('用户名或密码错误');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px 12px 44px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'all 0.2s ease-out',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const inputFocusStyle: React.CSSProperties = {
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  };

  return (
    <div style={pageStyle}>
      <div style={loginBoxStyle}>
        <div style={headerStyle}>
          <div
            style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#3b82f6',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <Lock size={32} color="#ffffff" />
          </div>
          <h1 style={titleStyle}>管理员登录</h1>
          <p style={subtitleStyle}>请输入管理员账号密码登录审批仪表板</p>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>用户名</label>
            <div style={{ position: 'relative' }}>
              <User
                size={18}
                color="#9ca3af"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                style={inputStyle}
                onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
                autoComplete="username"
              />
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>密码</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                color="#9ca3af"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="admin123"
                style={inputStyle}
                onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease-out',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
          >
            登录
          </button>
        </form>

        <div style={hintStyle}>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
            测试账号：admin / admin123
          </span>
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: 'calc(100vh - 56px)',
  backgroundColor: '#f3f4f6',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '32px 24px',
};

const loginBoxStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '400px',
  backgroundColor: '#ffffff',
  borderRadius: '14px',
  padding: '40px 32px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  border: '1px solid #e5e7eb',
};

const headerStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '32px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: '0 0 8px 0',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
  margin: 0,
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: '#374151',
};

const hintStyle: React.CSSProperties = {
  marginTop: '20px',
  textAlign: 'center',
};
