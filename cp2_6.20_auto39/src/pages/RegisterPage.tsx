import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

interface RegisterPageProps {
  onLogin: (user: any) => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码长度至少6位');
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
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
        setError(errData.error || '注册失败');
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
      <h1 className="login-title">创建账号</h1>
      
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
        <div className="form-group">
          <label className="form-label">确认密码</label>
          <input
            type="password"
            className="form-input"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
          注册
        </button>
      </form>

      <p className="login-subtitle">
        已有账号？<Link to="/login">立即登录</Link>
      </p>
    </div>
  );
};

export default RegisterPage;
