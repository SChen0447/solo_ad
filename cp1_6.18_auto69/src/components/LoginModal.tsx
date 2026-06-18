import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export const LoginModal = () => {
  const open = useStore((s) => s.loginModalOpen);
  const setOpen = useStore((s) => s.setLoginModalOpen);
  const setUser = useStore((s) => s.setUser);
  const redirectAfterLogin = useStore((s) => s.redirectAfterLogin);
  const setRedirectAfterLogin = useStore((s) => s.setRedirectAfterLogin);
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!open) {
      setUsername('');
      setPassword('');
      setMode('login');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    setLoading(true);
    try {
      const user = mode === 'login' ? await api.login(username, password) : await api.register(username, password);
      setUser(user);
      setOpen(false);
      toast.success(mode === 'login' ? '登录成功' : '注册成功');
      if (redirectAfterLogin) {
        navigate(redirectAfterLogin);
        setRedirectAfterLogin(null);
      }
    } catch (err: any) {
      toast.error(err.message || '操作失败');
      setShake(true);
      setTimeout(() => setShake(false), 400);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(26, 26, 46, 0.6)',
        backdropFilter: 'blur(10px)',
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: '420px',
          padding: '40px 32px',
          borderRadius: '20px',
          background: 'rgba(22, 33, 62, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          animation: `modalIn 0.3s ease-out ${shake ? ', shakeModal 0.4s' : ''}`,
        }}
      >
        <h2 style={{ color: '#fff', fontSize: '26px', margin: 0, marginBottom: '8px', textAlign: 'center' }}>
          {mode === 'login' ? '欢迎回来' : '创建账户'}
        </h2>
        <p style={{ color: '#888', margin: 0, marginBottom: '28px', textAlign: 'center', fontSize: '14px' }}>
          {mode === 'login' ? '登录后参与竞拍' : '加入我们的艺术社区'}
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#f0a500')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
            />
          </div>
          <div>
            <label style={{ color: '#ccc', fontSize: '13px', marginBottom: '6px', display: 'block' }}>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#f0a500')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #f0a500, #e89000)',
              color: '#1a1a2e',
              fontSize: '16px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(240, 165, 0, 0.35)';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {loading ? '处理中...' : mode === 'login' ? '登 录' : '注 册'}
          </button>
        </form>
        <div style={{ marginTop: '22px', textAlign: 'center', color: '#888', fontSize: '14px' }}>
          {mode === 'login' ? '还没有账户？' : '已有账户？'}
          <span
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            style={{ color: '#f0a500', cursor: 'pointer', marginLeft: '6px', fontWeight: 600 }}
          >
            {mode === 'login' ? '立即注册' : '立即登录'}
          </span>
        </div>
      </div>
    </div>
  );
};
