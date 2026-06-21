import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import CreateActivity from './CreateActivity';
import VotingPanel from './VotingPanel';
import Leaderboard from './Leaderboard';
import History from './History';
import { getUserId } from '../utils';

export default function App() {
  const [userId] = useState(getUserId());
  const location = useLocation();

  useEffect(() => {
    getUserId();
  }, []);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <Link to="/" className="logo">
            <span className="logo-icon">🎯</span>
            <span className="logo-text">创意投票看板</span>
          </Link>
          <nav className="nav">
            <Link
              to="/"
              className={`nav-link ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}
            >
              排名看板
            </Link>
            <Link
              to="/create"
              className={`nav-link ${isActive('/create') ? 'active' : ''}`}
            >
              创建活动
            </Link>
            <Link
              to="/history"
              className={`nav-link ${isActive('/history') ? 'active' : ''}`}
            >
              我的投票
            </Link>
          </nav>
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Leaderboard />} />
          <Route path="/create" element={<CreateActivity />} />
          <Route path="/activity/:id" element={<VotingPanel />} />
          <Route path="/history" element={<History userId={userId} />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <p>© 2024 创意投票看板 - 让每个想法都被听见</p>
      </footer>
    </div>
  );
}
