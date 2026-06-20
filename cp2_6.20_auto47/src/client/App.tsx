import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthStore } from './store';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import ActivityDetailPage from './pages/ActivityDetailPage';
import RankingPage from './pages/RankingPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import AdminActivityPage from './pages/AdminActivityPage';
import BadgeModal from './components/BadgeModal';

const NAV_ITEMS = [
  { path: '/', label: '所有活动' },
  { path: '/ranking', label: '服务排行榜' },
  { path: '/profile', label: '个人主页' },
];

export default function App() {
  const { user, isLoggedIn, logout } = useAuthStore();
  const { showBadgeModal, newBadges, hideBadgeModal } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    setContentVisible(false);
    const timer = setTimeout(() => setContentVisible(true), 10);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#FFF7ED]">
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 md:px-8"
        style={{
          background: 'rgba(255, 247, 237, 0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(245, 158, 11, 0.15)',
        }}>
        <div className="flex items-center gap-2 mr-8">
          <span className="text-xl">🤝</span>
          <span className="font-bold text-amber-700 text-lg hidden sm:inline">志愿星</span>
        </div>

        <div className="hidden md:flex items-center gap-6 flex-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="relative py-1 text-sm font-medium text-gray-600 hover:text-amber-700 transition-colors duration-200"
              style={{
                borderBottom: location.pathname === item.path
                  ? '2px solid #F59E0B'
                  : '2px solid transparent',
                transition: 'border-color 0.2s ease',
              }}
            >
              {item.label}
            </Link>
          ))}
          {user?.isAdmin && (
            <Link
              to="/admin/activity"
              className="relative py-1 text-sm font-medium text-gray-600 hover:text-amber-700 transition-colors duration-200"
              style={{
                borderBottom: location.pathname === '/admin/activity'
                  ? '2px solid #F59E0B'
                  : '2px solid transparent',
                transition: 'border-color 0.2s ease',
              }}
            >
              发布活动
            </Link>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3 ml-auto">
          {isLoggedIn && user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{user.nickname}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-red-500 transition-colors"
              >
                退出
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm text-gray-600 hover:text-amber-700 transition-colors">登录</Link>
              <Link
                to="/register"
                className="px-4 py-1.5 text-sm text-white rounded-lg font-medium"
                style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
              >
                注册
              </Link>
            </div>
          )}
        </div>

        <button
          className="md:hidden ml-auto p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/20" />
          <div
            className="absolute top-0 left-0 h-full w-4/5 p-6 pt-20"
            style={{
              background: 'rgba(255, 247, 237, 0.95)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              animation: 'slideInLeft 0.3s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`
              @keyframes slideInLeft {
                from { transform: translateX(-100%); }
                to { transform: translateX(0); }
              }
            `}</style>
            <div className="flex flex-col gap-4">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-lg font-medium text-gray-700 hover:text-amber-700 py-2 border-b border-amber-100"
                >
                  {item.label}
                </Link>
              ))}
              {user?.isAdmin && (
                <Link
                  to="/admin/activity"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-lg font-medium text-gray-700 hover:text-amber-700 py-2 border-b border-amber-100"
                >
                  发布活动
                </Link>
              )}
              <div className="mt-4 pt-4 border-t border-amber-200">
                {isLoggedIn && user ? (
                  <div className="flex flex-col gap-3">
                    <span className="text-gray-600">{user.nickname}</span>
                    <button
                      onClick={handleLogout}
                      className="text-left text-red-500 py-2"
                    >
                      退出登录
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 py-2">登录</Link>
                    <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="text-amber-700 font-medium py-2">注册</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="pt-14 min-h-screen">
        <div
          className="transition-all duration-300 ease-out"
          style={{
            opacity: contentVisible ? 1 : 0,
            transform: contentVisible ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/activity/:id" element={<ActivityDetailPage />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin/activity" element={<AdminActivityPage />} />
          </Routes>
        </div>
      </main>

      <BadgeModal
        visible={showBadgeModal}
        badges={newBadges}
        onClose={hideBadgeModal}
      />
    </div>
  );
}
