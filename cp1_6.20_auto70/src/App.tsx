import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Market from './pages/Market';
import Trade from './pages/Trade';
import Portfolio from './pages/Portfolio';
import { login, register } from './api';
import websocket from './websocket';

function LoginPage({ onAuth }: { onAuth: (email: string) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const res = await login(email, password);
        localStorage.setItem('token', res.token);
        onAuth(res.email);
        navigate('/dashboard');
      } else {
        await register(email, password);
        const res = await login(email, password);
        localStorage.setItem('token', res.token);
        onAuth(res.email);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-card">
        <h2>StockSim</h2>
        {error && <p style={{ color: '#e74c3c', marginBottom: '15px', textAlign: 'center' }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>邮箱</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="请输入邮箱" />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="请输入密码" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
          </button>
        </form>
        <div className="auth-switch">
          {isLogin ? '还没有账户？' : '已有账户？'}
          <span onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? '立即注册' : '立即登录'}
          </span>
        </div>
      </div>
    </div>
  );
}

function PrivateRoute({ children, isAuthenticated }: { children: React.ReactNode; isAuthenticated: boolean }) {
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function MainLayout({ children, user, onLogout }: { children: React.ReactNode; user: string | null; onLogout: () => void }) {
  return (
    <div className="layout">
      <Navbar user={user} onLogout={onLogout} />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<string | null>(() => {
    const token = localStorage.getItem('token');
    return token ? 'user@example.com' : null;
  });

  useEffect(() => {
    if (user) {
      websocket.connect();
    }
    return () => {
      websocket.disconnect();
    };
  }, [user]);

  const handleAuth = (email: string) => {
    setUser(email);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage onAuth={handleAuth} />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={
          <PrivateRoute isAuthenticated={!!user}>
            <MainLayout user={user} onLogout={handleLogout}>
            <Dashboard />
            </MainLayout>
          </PrivateRoute>
        } />
        <Route path="/market" element={
          <PrivateRoute isAuthenticated={!!user}>
            <MainLayout user={user} onLogout={handleLogout}>
            <Market />
            </MainLayout>
          </PrivateRoute>
        } />
        <Route path="/trade/:symbol" element={
          <PrivateRoute isAuthenticated={!!user}>
            <MainLayout user={user} onLogout={handleLogout}>
            <Trade />
            </MainLayout>
          </PrivateRoute>
        } />
        <Route path="/portfolio" element={
          <PrivateRoute isAuthenticated={!!user}>
            <MainLayout user={user} onLogout={handleLogout}>
            <Portfolio />
            </MainLayout>
          </PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
