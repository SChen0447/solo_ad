import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PetDetail from './pages/PetDetail';
import AdoptForm from './pages/AdoptForm';
import CommunityPage from './pages/CommunityPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import { authAPI } from './api';

interface UserInfo {
  id: number;
  email: string;
  nickname: string;
  is_admin: boolean;
}

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('user');
      }
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI.getMe().then(res => {
        const u = res.data;
        setUser(u);
        localStorage.setItem('user', JSON.stringify(u));
      }).catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      });
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    const poll = () => {
      authAPI.getMe().then(() => {}).catch(() => {});
    };
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M16 6c-2 0-3 1-4 3s-1 4 0 5c1 2 3 3 4 3s3-1 4-3c1-1 1-3 0-5s-2-3-4-3z" fill="currentColor"/>
          <circle cx="8" cy="10" r="3" fill="currentColor" opacity="0.7"/>
          <circle cx="24" cy="10" r="3" fill="currentColor" opacity="0.7"/>
          <path d="M10 20c0 3 2.5 6 6 6s6-3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
        </svg>
        PawHome
      </Link>
      <div className="navbar-links">
        <Link to="/" className={isActive('/') ? 'active' : ''}>领养</Link>
        <Link to="/community" className={isActive('/community') ? 'active' : ''}>社区</Link>
        {user?.is_admin && <Link to="/admin" className={isActive('/admin') ? 'active' : ''}>管理</Link>}
      </div>
      <div className="navbar-user">
        {user ? (
          <>
            <div className="avatar">{user.nickname[0]}</div>
            <span style={{ fontSize: 14, color: 'var(--text-light)' }}>{user.nickname}</span>
            <button className="btn btn-outline btn-sm" onClick={handleLogout}>退出</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-outline btn-sm">登录</Link>
            <Link to="/register" className="btn btn-primary btn-sm">注册</Link>
          </>
        )}
      </div>
      {notification && (
        <div className="toast toast-success" onClick={() => setNotification(null)}>
          {notification}
        </div>
      )}
    </nav>
  );
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/pet/:id" element={<PetDetail />} />
        <Route path="/adopt/:id" element={<AdoptForm />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </>
  );
}
