import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface User {
  id: number;
  username: string;
  role: string;
  token: string;
}

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegister && password !== confirm) {
      setError('两次密码不一致');
      return;
    }

    setLoading(true);
    try {
      const url = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await axios.post(url, { username, password });
      onLogin(res.data);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || (isRegister ? '注册失败' : '登录失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h2>{isRegister ? '注册账号' : '欢迎登录'}</h2>
        {error && (
          <div style={{ color: '#d62828', fontSize: 14, marginBottom: 16, textAlign: 'center' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="请输入用户名"
            />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="请输入密码"
            />
          </div>
          {isRegister && (
            <div className="form-group">
              <label>确认密码</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="请再次输入密码"
              />
            </div>
          )}
          <button
            type="submit"
            className={`btn btn-primary ${loading ? 'btn-disabled' : ''}`}
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? '请稍候...' : (isRegister ? '注册' : '登录')}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#888' }}>
          {isRegister ? '已有账号？' : '没有账号？'}
          <span
            style={{ color: 'var(--ink-green)', cursor: 'pointer', marginLeft: 4 }}
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
          >
            {isRegister ? '去登录' : '去注册'}
          </span>
        </div>
      </div>
    </div>
  );
}
