import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import './Auth.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useUser();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('请填写用户名和密码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (data.success) {
        login(data.data.user, data.data.token);
        navigate('/');
      } else {
        setError(data.message || '登录失败');
      }
    } catch (err) {
      setError('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <h1 className="auth-title">欢迎回来 👋</h1>
        <p className="auth-subtitle">登录你的美食之旅</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label>用户名 / 邮箱</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名或邮箱"
            />
          </div>

          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
            />
          </div>

          <button
            type="submit"
            className="auth-btn"
            disabled={loading}
          >
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>

        <div className="auth-footer">
          还没有账号？
          <Link to="/register" className="auth-link">
            立即注册
          </Link>
        </div>

        <div className="demo-tip">
          💡 演示账号：demo@example.com / password
        </div>
      </div>
    </div>
  );
};

export default Login;
