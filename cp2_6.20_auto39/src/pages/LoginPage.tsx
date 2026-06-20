import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

interface LoginPageProps {
  onLogin: (user: any) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        onLogin(data.user);
        navigate('/books');
      } else {
        const errData = await res.json();
        setError(errData.error || '登录失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    }
  };

  return (
    <div className="login-container">
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <BookOpen size={48} style={{ color: '#D4A373' }} />
      </div>
      <h1 className="login-title">欢迎回来</h1>
      
      {error && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#FCE8E4', 
          color: '#C35B4A', 
          borderRadius: '8px', 
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">用户名</label>
          <input
            type="text"
            className="form-input"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">密码</label>
          <input
            type="password"
            className="form-input"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
          登录
        </button>
      </form>

      <p className="login-subtitle">
        还没有账号？<Link to="/register">立即注册</Link>
      </p>
      
      <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#999' }}>
        测试账号：admin / admin123 (管理员) 或 bookworm / 123456 (读者)
      </p>
    </div>
  );
};

export default LoginPage;
