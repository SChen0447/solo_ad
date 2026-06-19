import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import './Auth.css';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useUser();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !email || !password) {
      setError('请填写完整信息');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码至少6位');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();
      if (data.success) {
        login(data.data.user, data.data.token);
        navigate('/');
      } else {
        setError(data.message || '注册失败');
      }
    } catch (err) {
      setError('注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <h1 className="auth-title">加入我们 🎉</h1>
        <p className="auth-subtitle">创建账号，开启美食分享之旅</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="给自己起个好听的名字"
            />
          </div>

          <div className="form-group">
            <label>邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱地址"
            />
          </div>

          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少6位密码"
            />
          </div>

          <div className="form-group">
            <label>确认密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
            />
          </div>

          <button
            type="submit"
            className="auth-btn"
            disabled={loading}
          >
            {loading ? '注册中...' : '注 册'}
          </button>
        </form>

        <div className="auth-footer">
          已有账号？
          <Link to="/login" className="auth-link">
            立即登录
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
