import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import PlanList from './pages/PlanList';
import CreatePlan from './pages/CreatePlan';
import PlanDetail from './pages/PlanDetail';
import Settings from './pages/Settings';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function AppContent() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('token'));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<{ nickname: string; avatar: string }>(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { nickname: parsed.nickname || '', avatar: parsed.avatar || '' };
    }
    return { nickname: '', avatar: '' };
  });

  useEffect(() => {
    const handleStorage = () => {
      setIsLoggedIn(!!localStorage.getItem('token'));
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserInfo({ nickname: parsed.nickname || '', avatar: parsed.avatar || '' });
      }
    };
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(() => {
      const token = localStorage.getItem('token');
      const newLoggedIn = !!token;
      if (newLoggedIn !== isLoggedIn) {
        setIsLoggedIn(newLoggedIn);
      }
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserInfo({ nickname: parsed.nickname || '', avatar: parsed.avatar || '' });
      }
    }, 500);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [isLoggedIn]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserInfo({ nickname: '', avatar: '' });
    navigate('/login');
  };

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <div className={`app-layout ${isLoggedIn ? 'has-sidebar' : ''}`}>
      {isLoggedIn && (
        <>
          <button className="hamburger" onClick={toggleSidebar}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <Sidebar
            nickname={userInfo.nickname}
            avatar={userInfo.avatar}
            onLogout={handleLogout}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={toggleSidebar}
          />
        </>
      )}
      <main className="main-content">
        <Routes>
          <Route path="/login" element={isLoggedIn ? <Navigate to="/" /> : <Login />} />
          <Route path="/" element={<PrivateRoute><PlanList /></PrivateRoute>} />
          <Route path="/create" element={<PrivateRoute><CreatePlan /></PrivateRoute>} />
          <Route path="/plan/:id" element={<PrivateRoute><PlanDetail /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
