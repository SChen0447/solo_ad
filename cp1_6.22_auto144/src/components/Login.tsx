import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, name, nickname);
      } else {
        await login(email);
      }
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (userEmail: string) => {
    setEmail(userEmail);
    setLoading(true);
    try {
      await login(userEmail);
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🎓</div>
          <h1 className="login-title">社团招新系统</h1>
          <p className="login-subtitle">
            {isRegister ? '创建新账号' : '登录您的账号'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <div className="form-group">
                <label className="form-label">姓名</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入您的姓名"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">昵称</label>
                <input
                  type="text"
                  className="form-input"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="请输入昵称"
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">邮箱</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱地址"
              required
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? '处理中...' : isRegister ? '注册' : '登录'}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
          <p className="text-secondary" style={{ fontSize: '12px', marginBottom: '12px', textAlign: 'center' }}>
            快速登录（演示账号）：
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => quickLogin('admin@school.edu')}
              disabled={loading}
            >
              管理员
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => quickLogin('zhangsan@school.edu')}
              disabled={loading}
            >
              学生张三
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => quickLogin('lisi@school.edu')}
              disabled={loading}
            >
              学生李四
            </button>
          </div>
        </div>

        <div className="login-footer">
          {isRegister ? '已有账号？' : '没有账号？'}
          <button type="button" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? '立即登录' : '立即注册'}
          </button>
        </div>
      </div>
    </div>
  );
}
