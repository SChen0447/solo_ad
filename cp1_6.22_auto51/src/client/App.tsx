import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import LobbyPage from './pages/LobbyPage';
import VotePage from './pages/VotePage';
import ResultPage from './pages/ResultPage';
import './styles.css';

const NavBar: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        backgroundColor: 'rgba(26, 32, 44, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        borderBottom: '1px solid rgba(74, 85, 104, 0.3)',
      }}
    >
      <Link
        to="/"
        style={{
          color: '#e2e8f0',
          textDecoration: 'none',
          fontSize: '18px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #6b46c1, #805ad5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: '#fff',
          }}
        >
          ✓
        </span>
        QuickVote
      </Link>
      {!isHome && (
        <Link
          to="/"
          style={{
            marginLeft: 'auto',
            color: '#a0aec0',
            textDecoration: 'none',
            fontSize: '14px',
            padding: '6px 14px',
            borderRadius: '8px',
            backgroundColor: 'rgba(74, 85, 104, 0.3)',
            transition: 'all 0.2s',
          }}
        >
          ← 返回大厅
        </Link>
      )}
    </nav>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#1a202c',
          color: '#e2e8f0',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans SC", sans-serif',
        }}
      >
        <NavBar />
        <main style={{ paddingTop: '56px' }}>
          <Routes>
            <Route path="/" element={<LobbyPage />} />
            <Route path="/vote/:code" element={<VotePage />} />
            <Route path="/result/:code" element={<ResultPage />} />
            <Route path="*" element={<LobbyPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
