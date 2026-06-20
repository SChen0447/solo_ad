import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from './utils/api';
import HomePage from './pages/HomePage';
import ListingPage from './pages/ListingPage';
import SearchPage from './pages/SearchPage';
import DetailPage from './pages/DetailPage';
import UserCenterPage from './pages/UserCenterPage';
import TransactionDetailPage from './pages/TransactionDetailPage';
import ReportDetailPage from './pages/ReportDetailPage';
import type { UserProfile } from './types';

interface AppContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  setError: (e: string | null) => void;
  refreshUser: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

const navItems = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/listing', label: '发布验机', icon: '📸' },
  { to: '/search', label: '搜索乐器', icon: '🔍' },
  { to: '/user', label: '用户中心', icon: '👤' },
];

const Sidebar: React.FC = () => {
  const { user, loading } = useApp();
  return (
    <aside className="sidebar">
      <div style={{ marginBottom: 32, padding: '0 8px' }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#8B5E3C', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🎸</span>
          <span>乐验通</span>
        </div>
        <div style={{ fontSize: 12, color: '#8c7b6a', marginTop: 4 }}>二手乐器验机与交易</div>
      </div>

      <nav style={{ flex: 1 }}>
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}>
            {({ isActive }) => (
              <div className={`nav-item ${isActive ? 'active' : ''}`}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: 16, background: 'rgba(139, 94, 60, 0.06)', borderRadius: 12, marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 28 }}>{loading ? '⏳' : user?.avatar || '🎵'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2d2a26' }}>
              {loading ? '加载中...' : user?.nickname || '游客'}
            </div>
            {user && (
              <div style={{ fontSize: 11, color: '#8c7b6a', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <span className="star-filled">★</span>
                <span>{user.reputation.toFixed(1)}</span>
                <span style={{ opacity: 0.7 }}>({user.total_ratings})</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

const MobileNav: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));
  return (
    <nav className="mobile-nav">
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to} style={{ flex: 1, display: 'flex' }}>
          <div className={`mobile-nav-item ${isActive(item.to) ? 'active' : ''}`}>
            <span className="mobile-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        </NavLink>
      ))}
    </nav>
  );
};

const LoadingOverlay: React.FC = () => {
  const { loading } = useApp();
  if (!loading) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        background: 'rgba(255,255,255,0.95)',
        padding: '10px 18px',
        borderRadius: 999,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
      <span style={{ fontSize: 13, color: '#5c554d', fontWeight: 500 }}>处理中...</span>
    </motion.div>
  );
};

const ErrorToast: React.FC = () => {
  const { error, setError } = useApp();
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 3500);
      return () => clearTimeout(t);
    }
  }, [error, setError]);
  if (!error) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: '#ef4444',
        color: '#fff',
        padding: '12px 24px',
        borderRadius: 12,
        boxShadow: '0 6px 24px rgba(239, 68, 68, 0.3)',
        fontSize: 14,
        fontWeight: 500,
        maxWidth: '80vw',
      }}
      onClick={() => setError(null)}
    >
      ⚠️ {error}
    </motion.div>
  );
};

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  return (
    <motion.main
      key={location.pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="content-area"
    >
      {children}
    </motion.main>
  );
};

const AppContent: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh' }}>
      <Sidebar />
      <AnimatePresence mode="wait">
        <PageWrapper>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/listing" element={<ListingPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/instrument/:id" element={<DetailPage />} />
            <Route path="/report/:id" element={<ReportDetailPage />} />
            <Route path="/transaction/:id" element={<TransactionDetailPage />} />
            <Route path="/user" element={<UserCenterPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </PageWrapper>
      </AnimatePresence>
      <MobileNav />
      <LoadingOverlay />
      <ErrorToast />
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const offLoading = api.onLoading((l) => setLoading(l));
    const offError = api.onError((e) => setError(e));
    return () => {
      offLoading();
      offError();
    };
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.getUser();
      setUser(data);
    } catch {
      setUser({
        id: 'user_demo',
        nickname: '乐器爱好者小王',
        avatar: '🎸',
        reputation: 4.7,
        total_ratings: 128,
      });
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <AppContext.Provider value={{ user, loading, error, setError, refreshUser }}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AppContext.Provider>
  );
};

export default App;
