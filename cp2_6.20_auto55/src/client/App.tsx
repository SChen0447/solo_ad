import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import type { Volunteer } from './api';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import ActivityDetailPage from './pages/ActivityDetailPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import RankingPage from './pages/RankingPage';
import AdminPage from './pages/AdminPage';

interface AuthContextType {
  user: Volunteer | null;
  setUser: (u: Volunteer | null) => void;
  showBadge: number | null;
  triggerBadge: (hours: number) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  showBadge: null,
  triggerBadge: () => {},
});

export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<Volunteer | null>(null);
  const [showBadge, setShowBadge] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('volunteer_user');
    if (saved) {
      try {
        setUserState(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const setUser = (u: Volunteer | null) => {
    setUserState(u);
    if (u) localStorage.setItem('volunteer_user', JSON.stringify(u));
    else localStorage.removeItem('volunteer_user');
  };

  const triggerBadge = (hours: number) => {
    setShowBadge(hours);
    setTimeout(() => setShowBadge(null), 3500);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, showBadge, triggerBadge }}>
      {children}
    </AuthContext.Provider>
  );
}

const AUTH_LEVEL_COLORS: Record<number, string> = {
  1: '#22C55E',
  2: '#84CC16',
  3: '#EAB308',
  4: '#F97316',
  5: '#8B5CF6',
};

function BadgeModal() {
  const { showBadge } = useAuth();
  const badgeInfo = useMemo(() => {
    if (showBadge === 10) return { icon: '🌱', title: '初心徽章', desc: '累计服务达10小时' };
    if (showBadge === 50) return { icon: '🌟', title: '热心徽章', desc: '累计服务达50小时' };
    if (showBadge === 100) return { icon: '👑', title: '卓越徽章', desc: '累计服务达100小时' };
    return null;
  }, [showBadge]);

  if (!badgeInfo) return null;

  return (
    <div className="badge-modal" style={{
      position: 'fixed',
      top: 20,
      left: '50%',
      transform: showBadge ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-120%)',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 1000,
      background: 'linear-gradient(135deg, #FFF7ED 0%, #FDE68A 100%)',
      borderRadius: 16,
      padding: '20px 32px',
      boxShadow: '0 20px 40px -10px rgba(245, 158, 11, 0.3), 0 0 0 1px rgba(245, 158, 11, 0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      minWidth: 320,
    }}>
      <div style={{
        fontSize: 48,
        animation: 'badgePop 0.5s ease-out',
      }}>{badgeInfo.icon}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: '#92400E', marginBottom: 4 }}>
          🎉 恭喜解锁新徽章！
        </div>
        <div style={{ fontWeight: 600, fontSize: 16, color: '#B45309' }}>{badgeInfo.title}</div>
        <div style={{ fontSize: 13, color: '#78350F', opacity: 0.8 }}>{badgeInfo.desc}</div>
      </div>
    </div>
  );
}

function Navbar() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: '活动广场' },
    { path: '/ranking', label: '服务排行' },
  ];

  const logout = () => {
    setUser(null);
    navigate('/');
    setMenuOpen(false);
  };

  const isActive = (p: string) => location.pathname === p;

  return (
    <>
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        background: 'rgba(255, 247, 237, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(245, 158, 11, 0.15)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
      }}>
        <Link to="/" style={{
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginRight: 40,
        }}>
          <span style={{ fontSize: 26 }}>🤝</span>
          <span style={{
            fontWeight: 800,
            fontSize: 18,
            background: 'linear-gradient(135deg, #F59E0B, #D97706)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>志愿者社区</span>
        </Link>

        <div style={{ display: 'flex', gap: 4, flex: 1, alignItems: 'center' }} className="nav-desktop">
          {navItems.map(item => (
            <Link key={item.path} to={item.path} style={{
              textDecoration: 'none',
              color: isActive(item.path) ? '#F59E0B' : '#57534E',
              fontWeight: isActive(item.path) ? 600 : 500,
              padding: '8px 14px',
              position: 'relative',
              fontSize: 14,
              transition: 'color 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#F59E0B')}
              onMouseLeave={e => (e.currentTarget.style.color = isActive(item.path) ? '#F59E0B' : '#57534E')}
            >
              {item.label}
              <span style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: isActive(item.path) ? 'calc(100% - 28px)' : '0',
                height: 2,
                background: '#F59E0B',
                borderRadius: 1,
                transition: 'width 0.2s ease',
              }} />
            </Link>
          ))}
          {user?.isAdmin && (
            <Link to="/admin" style={{
              textDecoration: 'none',
              color: isActive('/admin') ? '#F59E0B' : '#57534E',
              fontWeight: isActive('/admin') ? 600 : 500,
              padding: '8px 14px',
              position: 'relative',
              fontSize: 14,
            }}>
              ⚙️ 管理后台
              <span style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: isActive('/admin') ? 'calc(100% - 28px)' : '0',
                height: 2,
                background: '#F59E0B',
                borderRadius: 1,
                transition: 'width 0.2s ease',
              }} />
            </Link>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="nav-desktop">
          {user ? (
            <>
              <Link to="/profile" style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                textDecoration: 'none',
                padding: '4px 12px 4px 4px',
                borderRadius: 20,
                background: 'rgba(251, 191, 36, 0.1)',
                transition: 'background 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(251, 191, 36, 0.2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(251, 191, 36, 0.1)')}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: `2px solid ${AUTH_LEVEL_COLORS[user.authLevel] || '#F59E0B'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  background: '#FFF',
                }}>{user.avatar}</div>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#44403C' }}>{user.nickname}</span>
              </Link>
              <button onClick={logout} style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid #D6D3D1',
                background: '#FFF',
                color: '#57534E',
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.15s',
              }}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >退出</button>
            </>
          ) : (
            <>
              <Link to="/login" style={{
                textDecoration: 'none',
                padding: '8px 16px',
                color: '#57534E',
                fontSize: 14,
                fontWeight: 500,
              }}>登录</Link>
              <Link to="/register" style={{
                textDecoration: 'none',
                padding: '8px 18px',
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                color: '#FFF',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                transition: 'transform 0.15s',
              }}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              >注册</Link>
            </>
          )}
        </div>

        <button className="nav-mobile" onClick={() => setMenuOpen(!menuOpen)} style={{
          display: 'none',
          background: 'transparent',
          border: 'none',
          fontSize: 24,
          cursor: 'pointer',
          padding: 4,
        }}>☰</button>
      </nav>

      <div style={{
        position: 'fixed',
        top: 0,
        left: menuOpen ? 0 : '-80%',
        width: '80%',
        height: '100vh',
        background: 'rgba(255, 247, 237, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 200,
        transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: '76px 20px 20px',
        boxShadow: menuOpen ? '4px 0 30px rgba(0,0,0,0.1)' : 'none',
      }} className="nav-mobile-panel">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(item => (
            <Link key={item.path} to={item.path} onClick={() => setMenuOpen(false)} style={{
              textDecoration: 'none',
              padding: '14px 16px',
              color: isActive(item.path) ? '#F59E0B' : '#44403C',
              fontWeight: isActive(item.path) ? 600 : 500,
              fontSize: 15,
              borderRadius: 10,
              background: isActive(item.path) ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
            }}>{item.label}</Link>
          ))}
          {user?.isAdmin && (
            <Link to="/admin" onClick={() => setMenuOpen(false)} style={{
              textDecoration: 'none',
              padding: '14px 16px',
              color: '#44403C',
              fontWeight: 500,
              fontSize: 15,
              borderRadius: 10,
            }}>⚙️ 管理后台</Link>
          )}
          <div style={{ height: 1, background: '#E7E5E4', margin: '12px 0' }} />
          {user ? (
            <>
              <Link to="/profile" onClick={() => setMenuOpen(false)} style={{
                textDecoration: 'none',
                padding: '14px 16px',
                color: '#44403C',
                fontWeight: 500,
                fontSize: 15,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <span style={{ fontSize: 22 }}>{user.avatar}</span>
                <span>{user.nickname}</span>
              </Link>
              <button onClick={logout} style={{
                padding: '14px 16px',
                color: '#DC2626',
                fontWeight: 500,
                fontSize: 15,
                borderRadius: 10,
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
              }}>退出登录</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)} style={{
                textDecoration: 'none',
                padding: '14px 16px',
                color: '#44403C',
                fontWeight: 500,
                fontSize: 15,
                borderRadius: 10,
              }}>登录</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} style={{
                textDecoration: 'none',
                padding: '14px 16px',
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                color: '#FFF',
                fontWeight: 600,
                fontSize: 15,
                borderRadius: 10,
                textAlign: 'center',
              }}>立即注册</Link>
            </>
          )}
        </div>
      </div>

      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 150,
          }}
          className="nav-mobile-overlay"
        />
      )}

      <BadgeModal />
    </>
  );
}

function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    setRenderKey(k => k + 1);
  }, [location.pathname]);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <main style={{
        paddingTop: 72,
        paddingBottom: 40,
        maxWidth: 1200,
        margin: '0 auto',
        paddingLeft: 24,
        paddingRight: 24,
      }}>
        <div key={renderKey} className="page-enter" style={{
          animation: 'fadeUp 0.3s ease-out both',
        }}>
          {children}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes badgePop {
            0% { transform: scale(0.3); opacity: 0; }
            60% { transform: scale(1.15); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes trophyIn {
            0% { transform: scale(0); opacity: 0; }
            60% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes pulseGreen {
            0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6); }
            50% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
          }
          * { box-sizing: border-box; }
          ::-webkit-scrollbar { width: 8px; height: 8px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.3); border-radius: 4px; }
          ::-webkit-scrollbar-thumb:hover { background: rgba(245, 158, 11, 0.5); }
          input, select, textarea {
            font-family: inherit;
          }
          input:focus, select:focus, textarea:focus {
            border-color: #3B82F6 !important;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.18) !important;
          }
          @media (max-width: 768px) {
            .nav-desktop { display: none !important; }
            .nav-mobile { display: block !important; }
            .nav-mobile-panel { display: block !important; }
            .cards-grid { grid-template-columns: 1fr !important; }
            .profile-grid { grid-template-columns: 1fr !important; }
            .hero-stats { grid-template-columns: repeat(2, 1fr) !important; }
          }
        `}</style>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/activity/:id" element={<ActivityDetailPage />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}

export { AUTH_LEVEL_COLORS };
