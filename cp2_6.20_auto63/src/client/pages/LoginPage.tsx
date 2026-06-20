import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userApi } from '../api';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('请填写邮箱和密码');
      return;
    }

    setLoading(true);
    try {
      const user = await userApi.login(email, password);
      login(user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">❤</div>
          <h1 className="auth-title">欢迎回来</h1>
          <p className="auth-subtitle">登录您的志愿者账号</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">邮箱</label>
            <input
              type="email"
              className={`form-input ${error ? 'form-input-error' : ''}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
            />
          </div>

          <div className="form-group">
            <label className="form-label">密码</label>
            <input
              type="password"
              className={`form-input ${error ? 'form-input-error' : ''}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
            />
            {error && <div className="form-error">{error}</div>}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="auth-footer">
          还没有账号？ <Link to="/register">立即注册</Link>
        </div>

        <div style={{ marginTop: '24px', padding: '16px', background: '#F9FAFB', borderRadius: '8px', fontSize: '13px', color: '#6B7280' }}>
          <p style={{ marginBottom: '8px', fontWeight: 500 }}>测试账号：</p>
          <p>管理员：admin@example.com / admin123</p>
          <p>志愿者：xiaowang@example.com / 123456</p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
