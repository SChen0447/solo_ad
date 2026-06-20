import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setToken, User } from '../services/api'

interface LoginProps {
  onLogin: (user: User) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await api.login(username, password)
      setToken(result.token)
      onLogin(result.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = (role: 'member' | 'coach' | 'admin') => {
    const accounts: Record<string, { username: string; password: string }> = {
      member: { username: 'member1', password: '123456' },
      coach: { username: 'coach1', password: '123456' },
      admin: { username: 'admin', password: '123456' }
    }
    setUsername(accounts[role].username)
    setPassword(accounts[role].password)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="url(#grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#2563EB" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1>健身课程预约系统</h1>
          <p>欢迎回来，请登录您的账户</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message error-shake">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>

        <div className="quick-login">
          <p>快速登录体验：</p>
          <div className="quick-login-buttons">
            <button className="btn-quick" onClick={() => quickLogin('member')}>
              会员
            </button>
            <button className="btn-quick" onClick={() => quickLogin('coach')}>
              教练
            </button>
            <button className="btn-quick" onClick={() => quickLogin('admin')}>
              管理员
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
