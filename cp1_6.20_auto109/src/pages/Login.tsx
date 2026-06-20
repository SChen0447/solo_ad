import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(identifier, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content">
      <div className="form-container">
        <h1 className="page-title" style={{ textAlign: 'center' }}>
          登录
        </h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">用户名或邮箱</label>
            <input
              type="text"
              className="form-input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              placeholder="请输入用户名或邮箱"
            />
          </div>
          <div className="form-group">
            <label className="form-label">密码</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="请输入密码"
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '16px' }}
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--color-text-secondary)' }}>
          还没有账号？
          <Link
            to="/register"
            style={{ color: 'var(--color-primary)', marginLeft: '4px' }}
          >
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
