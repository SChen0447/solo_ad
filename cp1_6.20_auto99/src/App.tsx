import React, { useState, useEffect, useCallback, createContext, useContext, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { User, Plan } from './types';
import { authApi, planApi, socketEvents, disconnectSocket } from './services/api';

const PlanList = lazy(() => import('./pages/PlanList'));
const PlanDetail = lazy(() => import('./pages/PlanDetail'));

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  plans: Plan[];
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const pageVariants = {
  initial: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0
  }),
  animate: {
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0
  })
};

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.3
};

const Navbar: React.FC<{ user: User | null; onLogout: () => Promise<void> }> = ({ user, onLogout }) => {
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <nav style={navbarStyle}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/plans')}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3182ce" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span style={{ fontWeight: 600, fontSize: '18px', color: '#1a202c' }}>行程规划</span>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'relative', display: 'inline-block' }} onClick={() => setShowMenu(!showMenu)}>
            <img src={user.avatar} alt={user.name} style={{ width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
            <span className={`online-indicator ${user.online ? '' : 'offline'}`} style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', borderRadius: '50%', backgroundColor: user.online ? '#38a169' : '#718096', border: '2px solid white' }}></span>
          </div>
          {showMenu && (
            <div style={{ position: 'absolute', top: '52px', right: 0, backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', minWidth: '180px', zIndex: 100 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 500, color: '#1a202c' }}>{user.name}</div>
                <div style={{ fontSize: '12px', color: '#718096' }}>{user.email}</div>
              </div>
              <button style={{ width: '100%', padding: '12px 16px', textAlign: 'left', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#e53e3e', fontSize: '14px' }} onClick={async () => { await onLogout(); setShowMenu(false); }}>
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, name, password);
      }
      navigate('/plans');
    } catch (err: any) {
      setError(err.response?.data?.error || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3182ce" strokeWidth="2" style={{ margin: '0 auto 16px' }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a202c', marginBottom: '8px' }}>团队行程规划</h1>
          <p style={{ color: '#718096', fontSize: '14px' }}>轻松规划，快乐出行</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', marginBottom: '24px', backgroundColor: '#f7fafc', borderRadius: '8px', padding: '4px' }}>
            <button type="button" onClick={() => setIsLogin(true)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 500, backgroundColor: isLogin ? 'white' : 'transparent', color: isLogin ? '#3182ce' : '#718096', boxShadow: isLogin ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              登录
            </button>
            <button type="button" onClick={() => setIsLogin(false)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 500, backgroundColor: !isLogin ? 'white' : 'transparent', color: !isLogin ? '#3182ce' : '#718096', boxShadow: !isLogin ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              注册
            </button>
          </div>
          {error && <div style={{ backgroundColor: '#fff5f5', color: '#e53e3e', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
          {!isLogin && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>姓名</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="请输入姓名" style={{ width: '100%' }} required />
            </div>
          )}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>邮箱</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="请输入邮箱" style={{ width: '100%' }} required />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>密码</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" style={{ width: '100%' }} required minLength={6} />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '16px' }}>
            {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#3182ce', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const paths = ['/plans', '/plans/:id'];
    const currentIdx = paths.findIndex(p => location.pathname.match(new RegExp('^' + p.replace(':id', '[^/]+') + '$')));
    const prevIdx = paths.findIndex(p => location.pathname.match(new RegExp('^' + p.replace(':id', '[^/]+') + '$')));
    setDirection(currentIdx > prevIdx ? 1 : -1);
  }, [location.pathname]);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/" element={<Navigate to="/plans" replace />} />
        <Route path="/plans" element={
          <ProtectedRoute>
            <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>加载中...</div>}>
              <motion.div custom={direction} variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
                <PlanList />
              </motion.div>
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/plans/:id" element={
          <ProtectedRoute>
            <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>加载中...</div>}>
              <motion.div custom={direction} variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
                <PlanDetail />
              </motion.div>
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/plans" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

const navbarStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: '64px',
  backgroundColor: 'white',
  borderBottom: '1px solid #e2e8f0',
  zIndex: 1000
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const me = await authApi.getMe();
        setUser(me);
        const userPlans = await planApi.getPlans();
        setPlans(userPlans);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const userData = await authApi.login({ email, password });
    setUser(userData);
    const userPlans = await planApi.getPlans();
    setPlans(userPlans);
  }, []);

  const register = useCallback(async (email: string, name: string, password: string) => {
    const userData = await authApi.register({ email, name, password });
    setUser(userData);
    setPlans([]);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    socketEvents.offAll();
    disconnectSocket();
    setUser(null);
    setPlans([]);
  }, []);

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    plans,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      <div style={{ minHeight: '100vh' }}>
        <Navbar user={user} onLogout={logout} />
        <div style={{ paddingTop: user ? '64px' : 0, minHeight: '100vh' }}>
          <AnimatedRoutes />
        </div>
      </div>
    </AuthContext.Provider>
  );
};

export default App;
