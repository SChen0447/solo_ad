import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import BookList from './pages/BookList';
import MyLoans from './pages/MyLoans';
import ActivityBoard from './pages/ActivityBoard';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

interface User {
  id: number;
  username: string;
  role: string;
  token: string;
}

const navItems = [
  { path: '/', label: '图书列表' },
  { path: '/my-loans', label: '我的借阅' },
  { path: '/activities', label: '活动看板' },
];

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

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
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
    } else {
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [user]);

  const handleLogin = (userData: User) => {
    setUser(userData);
    navigate('/');
  };

  const handleLogout = () => {
    setUser(null);
    navigate('/');
  };

  return (
    <>
      <header className="header">
        <Link to="/" className="logo">📚 社区图书馆</Link>
        <nav className="nav-links">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path}>{item.label}</Link>
          ))}
          {user?.role === 'admin' && (
            <Link to="/admin">管理后台</Link>
          )}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <>
              <span style={{ fontSize: 14, color: '#666' }}>{user.username}</span>
              <button className="btn btn-primary" onClick={handleLogout}>退出</button>
            </>
          ) : (
            <Link to="/login">
              <button className="btn btn-primary">登录</button>
            </Link>
          )}
          <button className="hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      <div className={`mobile-nav ${mobileOpen ? 'open' : ''}`}>
        {navItems.map((item) => (
          <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>{item.label}</Link>
        ))}
        {user?.role === 'admin' && (
          <Link to="/admin" onClick={() => setMobileOpen(false)}>管理后台</Link>
        )}
      </div>

      <div className="page-container">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<BookList user={user} />} />
            <Route path="/my-loans" element={<MyLoans user={user} />} />
            <Route path="/activities" element={<ActivityBoard user={user} />} />
            <Route path="/admin" element={<Dashboard user={user} />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
          </Routes>
        </AnimatePresence>
      </div>

      <footer className="footer">
        © 2024 社区图书馆 · 让阅读连接邻里
      </footer>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
