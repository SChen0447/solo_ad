import React, { useState } from 'react';
import { authApi } from './api';

interface LoginProps {
  onAuthSuccess: (username: string) => void;
}

const Login: React.FC<LoginProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ username: false, password: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTouched({ username: true, password: true });

    if (!username.trim() || !password.trim()) {
      setLoading(false);
      return;
    }

    try {
      const result = isLogin
        ? await authApi.login(username, password)
        : await authApi.register(username, password);
      localStorage.setItem('token', result.token);
      localStorage.setItem('username', result.username);
      onAuthSuccess(result.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const isValidUsername = username.trim().length > 0;
  const isValidPassword = password.trim().length > 0;

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🏨</div>
          <h1>民宿前台管理系统</h1>
          <p>{isLogin ? '欢迎回来' : '创建新账户'}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>用户名</label>
            <div className="input-wrapper">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => setTouched({ ...touched, username: true })}
                className={touched.username && !isValidUsername ? 'input-error' : ''}
                placeholder="请输入用户名"
              />
              {touched.username && (
                <span className={`input-icon ${isValidUsername ? 'valid' : 'invalid'}`}>
                  {isValidUsername ? '✓' : '!'}
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>密码</label>
            <div className="input-wrapper">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched({ ...touched, password: true })}
                className={touched.password && !isValidPassword ? 'input-error' : ''}
                placeholder="请输入密码"
              />
              {touched.password && (
                <span className={`input-icon ${isValidPassword ? 'valid' : 'invalid'}`}>
                  {isValidPassword ? '✓' : '!'}
                </span>
              )}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '处理中...' : isLogin ? '登录' : '注册'}
          </button>
        </form>

        <div className="login-footer">
          <span>{isLogin ? '还没有账户？' : '已有账户？'}</span>
          <button type="button" className="btn-link" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? '立即注册' : '去登录'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
