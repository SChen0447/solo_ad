import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../App';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await api.login(email.trim(), password);
      setUser(res.user);
      navigate(res.user.isAdmin ? '/admin' : '/');
    } catch (e: any) {
      setErr(e.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 440, margin: '0 auto' }}>
      <div style={{
        background: '#FFF',
        borderRadius: 20,
        padding: 36,
        boxShadow: '0 4px 24px rgba(245, 158, 11, 0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🤝</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#292524' }}>欢迎回来</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#78716C' }}>登录继续您的志愿之旅</p>
        </div>

        {err && (
          <div style={{
            padding: '10px 14px',
            background: '#FEE2E2',
            color: '#B91C1C',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 18,
          }}>⚠️ {err}</div>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={labelStyle}>邮箱</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
              style={inputStyle}
            />
          </div>

          <button type="submit" disabled={loading}
            style={{
              padding: '13px 24px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: '#FFF',
              fontWeight: 700,
              fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)',
              transition: 'transform 0.15s',
              opacity: loading ? 0.7 : 1,
            }}
            onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >{loading ? '登录中...' : '🚀 登录'}</button>
        </form>

        <div style={{
          marginTop: 20,
          padding: 14,
          background: '#EFF6FF',
          borderRadius: 10,
          fontSize: 12,
          color: '#1E40AF',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>💡 测试账号</div>
          <div>志愿者: wang@example.com / 123456</div>
          <div>管理员: admin@example.com / admin123</div>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: 22,
          paddingTop: 18,
          borderTop: '1px solid #F5F5F4',
          fontSize: 13,
          color: '#78716C',
        }}>
          还没有账号？<Link to="/register" style={{ color: '#F59E0B', fontWeight: 600, textDecoration: 'none' }}>立即注册</Link>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#44403C',
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 8,
  border: '1.5px solid #E7E5E4',
  fontSize: 14,
  outline: 'none',
  transition: 'all 0.25s ease',
  background: '#FFF',
  color: '#292524',
};
