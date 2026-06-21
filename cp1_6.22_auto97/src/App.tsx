import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import BoardPage from './pages/BoardPage';
import SprintPage from './pages/SprintPage';
import './styles.css';

const BoardIcon: React.FC<{ active?: boolean }> = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="18" rx="1.5" />
    <rect x="14" y="3" width="7" height="11" rx="1.5" />
    <rect x="14" y="17" width="7" height="4" rx="1.5" />
  </svg>
);

const SprintIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const App: React.FC = () => {
  return (
    <div className="app-layout">
      <nav className="sidebar-nav">
        <NavLink
          to="/board"
          className={({ isActive }) => `nav-icon ${isActive ? 'active' : ''}`}
          title="任务看板"
        >
          <BoardIcon />
        </NavLink>
        <NavLink
          to="/sprint"
          className={({ isActive }) => `nav-icon ${isActive ? 'active' : ''}`}
          title="冲刺详情"
        >
          <SprintIcon />
        </NavLink>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/board" replace />} />
          <Route path="/board" element={<BoardPage />} />
          <Route path="/sprint" element={<SprintPage />} />
          <Route path="*" element={<Navigate to="/board" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
